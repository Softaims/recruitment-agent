import { Injectable, Logger } from '@nestjs/common';
import { ConversationMessage, MessageRole, Prisma } from '@prisma/client';
import { ConversationRepository } from './conversation.repository';
import { SessionsService } from '../sessions/sessions.service';
import { Assert } from '../../common/utils/assert.util';
import { CreateMessageDto } from './dto/create-message.dto';
import { ChatMessageDto } from './dto/chat-message.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly sessionsService: SessionsService,
  ) {}

  async processMessage(payload: ChatMessageDto): Promise<ConversationMessage> {
    Assert.notNull(payload.sessionId, 'Session ID is required');
    Assert.notNull(payload.content, 'Message content is required');
    Assert.notNull(payload.role, 'Message role is required');

    // Validate session exists and is active
    const session = await this.sessionsService.getSession(payload.sessionId);
    Assert.notNull(session, 'Session not found or expired');

    // Update session activity
    await this.sessionsService.updateSessionActivity(payload.sessionId);

    // Create message
    const messageData: Prisma.ConversationMessageCreateInput = {
      session: { connect: { id: payload.sessionId } },
      content: payload.content,
      role: payload.role,
      metadata: payload.metadata || {},
    };

    const message = await this.conversationRepository.create(messageData);

    this.logger.log(
      `Created message ${message.id} in session ${payload.sessionId}`,
    );
    return message;
  }

  async createMessage(
    sessionId: string,
    data: CreateMessageDto,
  ): Promise<ConversationMessage> {
    Assert.notNull(sessionId, 'Session ID is required');
    Assert.notNull(data.content, 'Message content is required');

    // Validate session exists and is active
    const session = await this.sessionsService.getSession(sessionId);
    Assert.notNull(session, 'Session not found or expired');

    const messageData: Prisma.ConversationMessageCreateInput = {
      session: { connect: { id: sessionId } },
      content: data.content,
      role: data.role,
      metadata: data.metadata || {},
    };

    const message = await this.conversationRepository.create(messageData);

    // Update session activity
    await this.sessionsService.updateSessionActivity(sessionId);

    this.logger.log(`Created message ${message.id} in session ${sessionId}`);
    return message;
  }

  async getConversationHistory(
    sessionId: string,
    limit = 50,
    offset = 0,
  ): Promise<ConversationMessage[]> {
    Assert.notNull(sessionId, 'Session ID is required');

    // Validate session exists
    const session = await this.sessionsService.getSession(sessionId);
    Assert.notNull(session, 'Session not found or expired');

    return this.conversationRepository.findBySessionId(
      sessionId,
      limit,
      offset,
    );
  }

  async getRecentMessages(
    sessionId: string,
    limit = 10,
  ): Promise<ConversationMessage[]> {
    Assert.notNull(sessionId, 'Session ID is required');

    // Validate session exists
    const session = await this.sessionsService.getSession(sessionId);
    Assert.notNull(session, 'Session not found or expired');

    return this.conversationRepository.findRecentBySessionId(sessionId, limit);
  }

  async getMessage(messageId: string): Promise<ConversationMessage> {
    Assert.notNull(messageId, 'Message ID is required');

    const message = await this.conversationRepository.findById(messageId);
    Assert.notNull(message, 'Message not found');

    return message;
  }

  async updateMessage(
    messageId: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<ConversationMessage> {
    Assert.notNull(messageId, 'Message ID is required');
    Assert.notNull(content, 'Message content is required');

    const existingMessage =
      await this.conversationRepository.findById(messageId);
    Assert.notNull(existingMessage, 'Message not found');

    const updateData: Prisma.ConversationMessageUpdateInput = {
      content,
    };

    if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    const updatedMessage = await this.conversationRepository.update(
      messageId,
      updateData,
    );

    this.logger.log(`Updated message ${messageId}`);
    return updatedMessage;
  }

  async deleteMessage(messageId: string): Promise<void> {
    Assert.notNull(messageId, 'Message ID is required');

    const existingMessage =
      await this.conversationRepository.findById(messageId);
    Assert.notNull(existingMessage, 'Message not found');

    await this.conversationRepository.delete(messageId);

    this.logger.log(`Deleted message ${messageId}`);
  }

  async getMessageCount(sessionId: string): Promise<number> {
    Assert.notNull(sessionId, 'Session ID is required');

    return this.conversationRepository.countBySessionId(sessionId);
  }

  async clearConversation(sessionId: string): Promise<number> {
    Assert.notNull(sessionId, 'Session ID is required');

    // Validate session exists
    const session = await this.sessionsService.getSession(sessionId);
    Assert.notNull(session, 'Session not found or expired');

    const deletedCount =
      await this.conversationRepository.deleteBySessionId(sessionId);

    this.logger.log(
      `Cleared ${deletedCount} messages from session ${sessionId}`,
    );
    return deletedCount;
  }

  async createSystemMessage(
    sessionId: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<ConversationMessage> {
    return this.createMessage(sessionId, {
      content,
      role: MessageRole.SYSTEM,
      metadata,
    });
  }

  async createAssistantMessage(
    sessionId: string,
    content: string,
    metadata?: Record<string, any>,
  ): Promise<ConversationMessage> {
    return this.createMessage(sessionId, {
      content,
      role: MessageRole.ASSISTANT,
      metadata,
    });
  }

  async getMessagesSince(
    sessionId: string,
    since: Date,
  ): Promise<ConversationMessage[]> {
    Assert.notNull(sessionId, 'Session ID is required');
    Assert.notNull(since, 'Since date is required');

    return this.conversationRepository.findMessagesSince(sessionId, since);
  }
}
