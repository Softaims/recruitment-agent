import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { INestApplication } from '@nestjs/common';
import ioClient from 'socket.io-client';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { SessionsService } from '../sessions/sessions.service';
import { MessageRole, SessionStatus } from '@prisma/client';

describe('ChatGateway (Integration)', () => {
  let app: INestApplication;
  let gateway: ChatGateway;
  let chatService: jest.Mocked<ChatService>;
  let sessionsService: jest.Mocked<SessionsService>;
  let jwtService: JwtService;
  let clientSocket: any;
  let serverPort: number;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedpassword',
    preferences: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession = {
    id: 'session-1',
    userId: 'user-1',
    status: SessionStatus.ACTIVE,
    context: {},
    createdAt: new Date(),
    lastActivity: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    user: mockUser,
    messages: [],
  };

  const mockMessage = {
    id: 'message-1',
    sessionId: 'session-1',
    role: MessageRole.USER,
    content: 'Hello, world!',
    metadata: {},
    timestamp: new Date(),
  };

  beforeEach(async () => {
    const mockChatService = {
      processMessage: jest.fn(),
      getRecentMessages: jest.fn(),
      getMessageCount: jest.fn(),
    };

    const mockSessionsService = {
      getSession: jest.fn(),
      updateSessionActivity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: SessionsService,
          useValue: mockSessionsService,
        },
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    gateway = module.get<ChatGateway>(ChatGateway);
    chatService = module.get(ChatService);
    sessionsService = module.get(SessionsService);
    jwtService = module.get<JwtService>(JwtService);

    await app.listen(0);
    serverPort = app.getHttpServer().address().port;
  });

  afterEach(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    await app.close();
  });

  describe('Connection Handling', () => {
    it('should authenticate and accept valid connections', (done) => {
      // Mock JWT verification
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
      });

      clientSocket = ioClient(`http://localhost:${serverPort}/chat`, {
        auth: {
          token: 'valid-jwt-token',
        },
      });

      clientSocket.on('connected', (data) => {
        expect(data.type).toBe('system');
        expect(data.data.userId).toBe(mockUser.id);
        expect(data.data.message).toBe('Connected to chat server');
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should reject connections with invalid tokens', (done) => {
      // Mock JWT verification to throw error
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      clientSocket = ioClient(`http://localhost:${serverPort}/chat`, {
        auth: {
          token: 'invalid-jwt-token',
        },
        reconnection: false,
      });

      // Do not assert on 'connect' because server may connect then immediately disconnect
      let doneCalled = false;
      clientSocket.once('disconnect', (reason) => {
        expect(['server disconnect', 'io server disconnect']).toContain(reason);
        if (!doneCalled) {
          doneCalled = true;
          try {
            clientSocket.close();
          } catch {
            // intentionally ignored: socket may already be closed
            const ignored = true;
            void ignored;
          }
          done();
        }
      });
    });

    it('should reject connections without tokens', (done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}/chat`, {
        reconnection: false,
      });

      // Do not assert on 'connect' because server may connect then immediately disconnect
      let doneCalled = false;
      clientSocket.once('disconnect', (reason) => {
        expect(['server disconnect', 'io server disconnect']).toContain(reason);
        if (!doneCalled) {
          doneCalled = true;
          try {
            clientSocket.close();
          } catch {
            // intentionally ignored: socket may already be closed
            const ignored = true;
            void ignored;
          }
          done();
        }
      });
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      // Setup authenticated connection
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
      });

      clientSocket = ioClient(`http://localhost:${serverPort}/chat`, {
        auth: {
          token: 'valid-jwt-token',
        },
      });
    });

    it('should allow joining valid sessions', (done) => {
      sessionsService.getSession.mockResolvedValue(mockSession);
      sessionsService.updateSessionActivity.mockResolvedValue(mockSession);
      chatService.getRecentMessages.mockResolvedValue([mockMessage]);

      clientSocket.on('connected', () => {
        clientSocket.emit('join_session', { sessionId: 'session-1' });
      });

      clientSocket.on('session_joined', (data) => {
        expect(data.type).toBe('system');
        expect(data.data.sessionId).toBe('session-1');
        expect(data.data.recentMessages).toHaveLength(1);
        expect(data.data.recentMessages[0].content).toBe('Hello, world!');
        done();
      });

      clientSocket.on('error', (error) => {
        done(error);
      });
    });

    it('should reject joining non-existent sessions', (done) => {
      sessionsService.getSession.mockResolvedValue(null);

      clientSocket.on('connected', () => {
        clientSocket.emit('join_session', { sessionId: 'non-existent' });
      });

      clientSocket.on('error', (data) => {
        expect(data.type).toBe('error');
        expect(data.data.message).toBe('Session not found or expired');
        done();
      });
    });

    it('should reject joining sessions owned by other users', (done) => {
      const otherUserSession = {
        ...mockSession,
        userId: 'other-user',
      };
      sessionsService.getSession.mockResolvedValue(otherUserSession);

      clientSocket.on('connected', () => {
        clientSocket.emit('join_session', { sessionId: 'session-1' });
      });

      clientSocket.on('error', (data) => {
        expect(data.type).toBe('error');
        expect(data.data.message).toBe('Access denied to session');
        done();
      });
    });

    it('should allow leaving sessions', (done) => {
      sessionsService.getSession.mockResolvedValue(mockSession);
      sessionsService.updateSessionActivity.mockResolvedValue(mockSession);
      chatService.getRecentMessages.mockResolvedValue([]);

      let sessionJoined = false;

      clientSocket.on('connected', () => {
        clientSocket.emit('join_session', { sessionId: 'session-1' });
      });

      clientSocket.on('session_joined', () => {
        sessionJoined = true;
        clientSocket.emit('leave_session');
      });

      clientSocket.on('session_left', (data) => {
        expect(sessionJoined).toBe(true);
        expect(data.type).toBe('system');
        expect(data.data.sessionId).toBe('session-1');
        done();
      });
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      // Setup authenticated connection and join session
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
      });

      sessionsService.getSession.mockResolvedValue(mockSession);
      sessionsService.updateSessionActivity.mockResolvedValue(mockSession);
      chatService.getRecentMessages.mockResolvedValue([]);

      clientSocket = ioClient(`http://localhost:${serverPort}/chat`, {
        auth: {
          token: 'valid-jwt-token',
        },
      });
    });

    it('should process and broadcast messages', (done) => {
      chatService.processMessage.mockResolvedValue(mockMessage);

      let sessionJoined = false;

      clientSocket.on('connected', () => {
        clientSocket.emit('join_session', { sessionId: 'session-1' });
      });

      clientSocket.on('session_joined', () => {
        sessionJoined = true;
        clientSocket.emit('send_message', {
          content: 'Hello, world!',
          metadata: { test: true },
        });
      });

      clientSocket.on('message_received', (data) => {
        expect(sessionJoined).toBe(true);
        expect(data.type).toBe('message');
        expect(data.data.content).toBe('Hello, world!');
        expect(data.data.role).toBe(MessageRole.USER);
        expect(data.data.sessionId).toBe('session-1');

        expect(chatService.processMessage).toHaveBeenCalledWith({
          sessionId: 'session-1',
          content: 'Hello, world!',
          role: MessageRole.USER,
          metadata: { test: true },
        });

        done();
      });
    });

    it('should reject messages when not in a session', (done) => {
      clientSocket.on('connected', () => {
        // Don't join session, try to send message directly
        clientSocket.emit('send_message', {
          content: 'Hello, world!',
        });
      });

      clientSocket.on('error', (data) => {
        expect(data.type).toBe('error');
        expect(data.data.message).toBe('Not connected to a session');
        done();
      });
    });
  });

  describe('Typing Indicators', () => {
    beforeEach(() => {
      // Setup authenticated connection and join session
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
      });

      sessionsService.getSession.mockResolvedValue(mockSession);
      sessionsService.updateSessionActivity.mockResolvedValue(mockSession);
      chatService.getRecentMessages.mockResolvedValue([]);

      clientSocket = ioClient(`http://localhost:${serverPort}/chat`, {
        auth: {
          token: 'valid-jwt-token',
        },
      });
    });

    it('should handle typing indicators', (done) => {
      let sessionJoined = false;

      clientSocket.on('connected', () => {
        clientSocket.emit('join_session', { sessionId: 'session-1' });
      });

      clientSocket.on('session_joined', () => {
        sessionJoined = true;
        clientSocket.emit('typing', { isTyping: true });

        // Since we only have one client, we won't receive the typing indicator
        // In a real scenario with multiple clients, other clients would receive it
        setTimeout(() => {
          expect(sessionJoined).toBe(true);
          done();
        }, 100);
      });
    });
  });

  describe('Session Info', () => {
    beforeEach(() => {
      // Setup authenticated connection
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        sub: mockUser.id,
        email: mockUser.email,
      });

      clientSocket = ioClient(`http://localhost:${serverPort}/chat`, {
        auth: {
          token: 'valid-jwt-token',
        },
      });
    });

    it('should return session info when connected to session', (done) => {
      sessionsService.getSession.mockResolvedValue(mockSession);
      sessionsService.updateSessionActivity.mockResolvedValue(mockSession);
      chatService.getRecentMessages.mockResolvedValue([]);
      chatService.getMessageCount.mockResolvedValue(5);

      let sessionJoined = false;

      clientSocket.on('connected', () => {
        clientSocket.emit('join_session', { sessionId: 'session-1' });
      });

      clientSocket.on('session_joined', () => {
        sessionJoined = true;
        clientSocket.emit('get_session_info');
      });

      clientSocket.on('session_info', (data) => {
        expect(sessionJoined).toBe(true);
        expect(data.type).toBe('system');
        expect(data.data.connected).toBe(true);
        expect(data.data.sessionId).toBe('session-1');
        expect(data.data.messageCount).toBe(5);
        expect(data.data.session.id).toBe('session-1');
        done();
      });
    });

    it('should return disconnected info when not in session', (done) => {
      clientSocket.on('connected', () => {
        clientSocket.emit('get_session_info');
      });

      clientSocket.on('session_info', (data) => {
        expect(data.type).toBe('system');
        expect(data.data.connected).toBe(false);
        done();
      });
    });
  });
});
