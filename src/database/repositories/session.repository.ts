import { Injectable } from '@nestjs/common';
import { Session, Prisma, User, ConversationMessage } from '@prisma/client';
import { BaseRepository } from './base.repository';

@Injectable()
export class SessionRepository extends BaseRepository<Session> {
  async create(data: Prisma.SessionCreateInput): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  async findById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async update(id: string, data: Prisma.SessionUpdateInput): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.session.delete({
      where: { id },
    });
  }

  async findByUserId(userId: string, skip = 0, take = 50): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { lastActivity: 'desc' },
      include: { user: true },
    });
  }

  async findWithMessages(
    sessionId: string,
  ): Promise<
    (Session & { messages: ConversationMessage[]; user: User }) | null
  > {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: true,
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
  }

  async updateLastActivity(id: string): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data: { lastActivity: new Date() },
    });
  }

  async updateStatus(
    id: string,
    status: Prisma.EnumSessionStatusFieldUpdateOperationsInput,
  ): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data: { status },
    });
  }

  async updateContext(id: string, context: any): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data: { context },
    });
  }

  async findExpiredSessions(): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        status: {
          not: 'EXPIRED',
        },
      },
    });
  }

  async markExpired(sessionIds: string[]): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        id: {
          in: sessionIds,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });
  }

  async deleteExpiredSessions(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.session.deleteMany({
      where: {
        status: 'EXPIRED',
        expiresAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
