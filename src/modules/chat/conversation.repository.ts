import { Injectable, Logger } from '@nestjs/common';
import { ConversationMessage, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ConversationMessageWithSession } from './types/chat.types';

@Injectable()
export class ConversationRepository {
  private readonly logger = new Logger(ConversationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ConversationMessageCreateInput): Promise<ConversationMessage> {
    return this.prisma.conversationMessage.create({ data });
  }

  async findById(id: string): Promise<ConversationMessage | null> {
    return this.prisma.conversationMessage.findUnique({
      where: { id },
    });
  }

  async findByIdWithSession(id: string): Promise<ConversationMessageWithSession | null> {
    return this.prisma.conversationMessage.findUnique({
      where: { id },
      include: { session: true },
    });
  }

  async findBySessionId(sessionId: string, limit = 50, offset = 0): Promise<ConversationMessage[]> {
    return this.prisma.conversationMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async findRecentBySessionId(sessionId: string, limit = 10): Promise<ConversationMessage[]> {
    return this.prisma.conversationMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  async countBySessionId(sessionId: string): Promise<number> {
    return this.prisma.conversationMessage.count({
      where: { sessionId },
    });
  }

  async update(id: string, data: Prisma.ConversationMessageUpdateInput): Promise<ConversationMessage> {
    return this.prisma.conversationMessage.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.conversationMessage.delete({
      where: { id },
    });
  }

  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await this.prisma.conversationMessage.deleteMany({
      where: { sessionId },
    });
    return result.count;
  }

  async findMessagesSince(sessionId: string, since: Date): Promise<ConversationMessage[]> {
    return this.prisma.conversationMessage.findMany({
      where: {
        sessionId,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getConversationHistory(sessionId: string, limit = 50): Promise<ConversationMessage[]> {
    return this.prisma.conversationMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });
  }

  async createBatch(messages: Prisma.ConversationMessageCreateManyInput[]): Promise<number> {
    const result = await this.prisma.conversationMessage.createMany({
      data: messages,
    });
    return result.count;
  }
}