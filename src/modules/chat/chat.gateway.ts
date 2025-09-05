import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessageRole } from '@prisma/client';
import { ChatService } from './chat.service';
import { SessionsService } from '../sessions/sessions.service';
import { ChatMessageDto, SendMessageDto } from './dto/chat-message.dto';
import { ChatConnectionData, WebSocketMessage, TypingIndicator } from './types/chat.types';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly connections = new Map<string, ChatConnectionData>();

  constructor(
    private readonly chatService: ChatService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const user = await this.authenticateConnection(client);
      if (!user) {
        client.disconnect();
        return;
      }

      const connectionData: ChatConnectionData = {
        userId: user.id,
        connectedAt: new Date(),
      };

      this.connections.set(client.id, connectionData);
      
      this.logger.log(`Client ${client.id} connected for user ${user.id}`);
      
      // Send connection confirmation
      client.emit('connected', {
        type: 'system',
        data: { message: 'Connected to chat server', userId: user.id },
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Connection failed for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const connectionData = this.connections.get(client.id);
    
    if (connectionData) {
      // Update session activity if user was in a session
      if (connectionData.sessionId) {
        try {
          await this.sessionsService.updateSessionActivity(connectionData.sessionId);
          
          // Notify other clients in the session that user disconnected
          client.to(`session:${connectionData.sessionId}`).emit('user_disconnected', {
            type: 'system',
            data: { userId: connectionData.userId },
            timestamp: new Date(),
          });
        } catch (error) {
          this.logger.warn(`Failed to update session activity on disconnect:`, error);
        }
      }

      this.connections.delete(client.id);
      this.logger.log(`Client ${client.id} disconnected for user ${connectionData.userId}`);
    }
  }

  @SubscribeMessage('join_session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ): Promise<void> {
    try {
      const connectionData = this.connections.get(client.id);
      if (!connectionData) {
        throw new WsException('Connection not authenticated');
      }

      // Validate session exists and user has access
      const session = await this.sessionsService.getSession(data.sessionId);
      if (!session) {
        throw new WsException('Session not found or expired');
      }

      if (session.userId !== connectionData.userId) {
        throw new WsException('Access denied to session');
      }

      // Leave previous session room if any
      if (connectionData.sessionId) {
        client.leave(`session:${connectionData.sessionId}`);
      }

      // Join new session room
      client.join(`session:${data.sessionId}`);
      connectionData.sessionId = data.sessionId;
      this.connections.set(client.id, connectionData);

      // Update session activity
      await this.sessionsService.updateSessionActivity(data.sessionId);

      this.logger.log(`Client ${client.id} joined session ${data.sessionId}`);

      // Send confirmation and recent messages
      const recentMessages = await this.chatService.getRecentMessages(data.sessionId, 10);
      
      client.emit('session_joined', {
        type: 'system',
        data: { 
          sessionId: data.sessionId,
          recentMessages: recentMessages.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            metadata: msg.metadata,
          })),
        },
        timestamp: new Date(),
      });

      // Notify other clients in session
      client.to(`session:${data.sessionId}`).emit('user_joined', {
        type: 'system',
        data: { userId: connectionData.userId },
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Failed to join session:`, error);
      client.emit('error', {
        type: 'error',
        data: { message: error.message || 'Failed to join session' },
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('leave_session')
  async handleLeaveSession(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const connectionData = this.connections.get(client.id);
      if (!connectionData || !connectionData.sessionId) {
        return;
      }

      const sessionId = connectionData.sessionId;
      
      // Leave session room
      client.leave(`session:${sessionId}`);
      
      // Update session activity
      await this.sessionsService.updateSessionActivity(sessionId);

      // Notify other clients
      client.to(`session:${sessionId}`).emit('user_left', {
        type: 'system',
        data: { userId: connectionData.userId },
        timestamp: new Date(),
      });

      // Clear session from connection data
      connectionData.sessionId = undefined;
      this.connections.set(client.id, connectionData);

      this.logger.log(`Client ${client.id} left session ${sessionId}`);

      client.emit('session_left', {
        type: 'system',
        data: { sessionId },
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Failed to leave session:`, error);
      client.emit('error', {
        type: 'error',
        data: { message: 'Failed to leave session' },
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
  ): Promise<void> {
    try {
      const connectionData = this.connections.get(client.id);
      if (!connectionData || !connectionData.sessionId) {
        throw new WsException('Not connected to a session');
      }

      // Create message payload
      const messagePayload: ChatMessageDto = {
        sessionId: connectionData.sessionId,
        content: data.content,
        role: MessageRole.USER,
        metadata: data.metadata,
      };

      // Process message through service
      const message = await this.chatService.processMessage(messagePayload);

      // Prepare response
      const messageResponse = {
        id: message.id,
        sessionId: message.sessionId,
        role: message.role,
        content: message.content,
        metadata: message.metadata,
        timestamp: message.timestamp,
      };

      // Broadcast to all clients in the session
      this.server.to(`session:${connectionData.sessionId}`).emit('message_received', {
        type: 'message',
        data: messageResponse,
        timestamp: new Date(),
      });

      this.logger.log(`Message ${message.id} sent in session ${connectionData.sessionId}`);

    } catch (error) {
      this.logger.error(`Failed to send message:`, error);
      client.emit('error', {
        type: 'error',
        data: { message: error.message || 'Failed to send message' },
        timestamp: new Date(),
      });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { isTyping: boolean },
  ): Promise<void> {
    try {
      const connectionData = this.connections.get(client.id);
      if (!connectionData || !connectionData.sessionId) {
        return;
      }

      const typingData: TypingIndicator = {
        sessionId: connectionData.sessionId,
        userId: connectionData.userId,
        isTyping: data.isTyping,
      };

      // Broadcast typing indicator to other clients in session (not sender)
      client.to(`session:${connectionData.sessionId}`).emit('typing_indicator', {
        type: 'typing',
        data: typingData,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Failed to handle typing indicator:`, error);
    }
  }

  @SubscribeMessage('get_session_info')
  async handleGetSessionInfo(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const connectionData = this.connections.get(client.id);
      if (!connectionData || !connectionData.sessionId) {
        client.emit('session_info', {
          type: 'system',
          data: { connected: false },
          timestamp: new Date(),
        });
        return;
      }

      const session = await this.sessionsService.getSession(connectionData.sessionId);
      const messageCount = await this.chatService.getMessageCount(connectionData.sessionId);

      client.emit('session_info', {
        type: 'system',
        data: {
          connected: true,
          sessionId: connectionData.sessionId,
          session: {
            id: session.id,
            status: session.status,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
          },
          messageCount,
        },
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Failed to get session info:`, error);
      client.emit('error', {
        type: 'error',
        data: { message: 'Failed to get session info' },
        timestamp: new Date(),
      });
    }
  }

  // Private helper methods

  private async authenticateConnection(client: Socket): Promise<{ id: string; email: string } | null> {
    try {
      // Extract JWT from cookie or authorization header
      const token = this.extractTokenFromClient(client);
      if (!token) {
        this.logger.warn(`No token provided for client ${client.id}`);
        return null;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      if (!payload || !payload.sub) {
        this.logger.warn(`Invalid token for client ${client.id}`);
        return null;
      }

      return {
        id: payload.sub,
        email: payload.email,
      };

    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error);
      return null;
    }
  }

  private extractTokenFromClient(client: Socket): string | null {
    // Try to get token from handshake auth
    const authHeader = client.handshake.auth?.token || client.handshake.headers?.authorization;
    if (authHeader) {
      return authHeader.replace('Bearer ', '');
    }

    // Try to get token from cookies
    const cookies = client.handshake.headers?.cookie;
    if (cookies) {
      const jwtCookie = cookies
        .split(';')
        .find(cookie => cookie.trim().startsWith('jwt='));
      
      if (jwtCookie) {
        return jwtCookie.split('=')[1];
      }
    }

    return null;
  }

  // Public methods for external use

  public async broadcastToSession(sessionId: string, message: WebSocketMessage): Promise<void> {
    this.server.to(`session:${sessionId}`).emit('broadcast', message);
  }

  public async sendToUser(userId: string, message: WebSocketMessage): Promise<void> {
    // Find all connections for the user
    const userConnections = Array.from(this.connections.entries())
      .filter(([_, data]) => data.userId === userId)
      .map(([socketId]) => socketId);

    userConnections.forEach(socketId => {
      this.server.to(socketId).emit('direct_message', message);
    });
  }

  public getActiveConnections(): number {
    return this.connections.size;
  }

  public getSessionConnections(sessionId: string): number {
    return Array.from(this.connections.values())
      .filter(data => data.sessionId === sessionId).length;
  }
}