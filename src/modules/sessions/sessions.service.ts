import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Session, SessionStatus, Prisma } from '@prisma/client';
import { SessionRepository } from '../../database/repositories/session.repository';
import { RedisService } from '../../database/redis.service';
import { Assert } from '../../common/utils/assert.util';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import {
  SessionWithUser,
  SessionWithMessages,
  SessionCacheData,
  SessionConfig,
} from './types/session.types';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly config: SessionConfig;

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      defaultExpirationHours: this.configService.get(
        'app.session.defaultExpirationHours',
        24,
      ),
      cacheExpirationSeconds: this.configService.get(
        'app.session.cacheExpirationSeconds',
        3600,
      ),
      maxActiveSessions: this.configService.get(
        'app.session.maxActiveSessions',
        10,
      ),
      cleanupIntervalMinutes: this.configService.get(
        'app.session.cleanupIntervalMinutes',
        60,
      ),
    };
  }

  async createSession(
    userId: string,
    data?: CreateSessionDto,
  ): Promise<Session> {
    Assert.notNull(userId, 'User ID is required');

    // Check active session limit
    const activeSessions =
      await this.sessionRepository.findActiveByUserId(userId);
    if (activeSessions.length >= this.config.maxActiveSessions) {
      // Expire oldest session to make room
      const oldestSession = activeSessions[activeSessions.length - 1];
      await this.expireSession(oldestSession.id);
    }

    const expiresAt = data?.expiresAt || this.calculateDefaultExpiration();

    const sessionData: Prisma.SessionCreateInput = {
      user: { connect: { id: userId } },
      context: data?.context || {},
      expiresAt,
      status: SessionStatus.ACTIVE,
    };

    const session = await this.sessionRepository.create(sessionData);

    // Cache the session
    await this.cacheSession(session);

    this.logger.log(`Created session ${session.id} for user ${userId}`);
    return session;
  }

  async getSession(sessionId: string): Promise<SessionWithUser | null> {
    Assert.notNull(sessionId, 'Session ID is required');

    // Try cache first
    const cachedSession = await this.getCachedSession(sessionId);
    if (cachedSession) {
      return cachedSession;
    }

    // Fallback to database
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (this.isSessionExpired(session)) {
      await this.expireSession(sessionId);
      return null;
    }

    // Cache for future requests
    await this.cacheSession(session);

    return session as SessionWithUser;
  }

  async getSessionWithMessages(
    sessionId: string,
  ): Promise<SessionWithMessages | null> {
    Assert.notNull(sessionId, 'Session ID is required');

    const session = await this.sessionRepository.findWithMessages(sessionId);
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (this.isSessionExpired(session)) {
      await this.expireSession(sessionId);
      return null;
    }

    return session;
  }

  async getUserSessions(
    userId: string,
    skip = 0,
    take = 50,
  ): Promise<SessionWithUser[]> {
    Assert.notNull(userId, 'User ID is required');

    return this.sessionRepository.findByUserId(userId, skip, take) as Promise<
      SessionWithUser[]
    >;
  }

  async getActiveSessions(userId: string): Promise<SessionWithUser[]> {
    Assert.notNull(userId, 'User ID is required');

    return this.sessionRepository.findActiveByUserId(userId) as Promise<
      SessionWithUser[]
    >;
  }

  async updateSession(
    sessionId: string,
    data: UpdateSessionDto,
  ): Promise<Session> {
    Assert.notNull(sessionId, 'Session ID is required');

    const existingSession = await this.sessionRepository.findById(sessionId);
    Assert.notNull(existingSession, 'Session not found');

    const updateData: Prisma.SessionUpdateInput = {};

    if (data.context !== undefined) {
      updateData.context = data.context;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt;
    }

    const updatedSession = await this.sessionRepository.update(
      sessionId,
      updateData,
    );

    // Update cache
    await this.cacheSession(updatedSession);

    this.logger.log(`Updated session ${sessionId}`);
    return updatedSession;
  }

  async updateSessionActivity(sessionId: string): Promise<Session> {
    Assert.notNull(sessionId, 'Session ID is required');

    const session = await this.sessionRepository.updateLastActivity(sessionId);

    // Update cache with new activity time
    await this.cacheSession(session);

    return session;
  }

  async updateSessionContext(
    sessionId: string,
    context: any,
  ): Promise<Session> {
    Assert.notNull(sessionId, 'Session ID is required');
    Assert.notNull(context, 'Context is required');

    const session = await this.sessionRepository.updateContext(
      sessionId,
      context,
    );

    // Update cache
    await this.cacheSession(session);

    this.logger.log(`Updated context for session ${sessionId}`);
    return session;
  }

  async expireSession(sessionId: string): Promise<void> {
    Assert.notNull(sessionId, 'Session ID is required');

    await this.sessionRepository.update(sessionId, {
      status: SessionStatus.EXPIRED,
    });

    // Remove from cache
    await this.removeCachedSession(sessionId);

    this.logger.log(`Expired session ${sessionId}`);
  }

  async deleteSession(sessionId: string): Promise<void> {
    Assert.notNull(sessionId, 'Session ID is required');

    await this.sessionRepository.delete(sessionId);

    // Remove from cache
    await this.removeCachedSession(sessionId);

    this.logger.log(`Deleted session ${sessionId}`);
  }

  async cleanupExpiredSessions(): Promise<number> {
    const expiredSessions = await this.sessionRepository.findExpiredSessions();

    if (expiredSessions.length === 0) {
      return 0;
    }

    const sessionIds = expiredSessions.map((session) => session.id);

    // Mark as expired in database
    await this.sessionRepository.markExpired(sessionIds);

    // Remove from cache
    await Promise.all(sessionIds.map((id) => this.removeCachedSession(id)));

    this.logger.log(`Marked ${expiredSessions.length} sessions as expired`);
    return expiredSessions.length;
  }

  async deleteOldExpiredSessions(olderThanDays = 30): Promise<number> {
    const deletedCount =
      await this.sessionRepository.deleteExpiredSessions(olderThanDays);

    if (deletedCount > 0) {
      this.logger.log(`Deleted ${deletedCount} old expired sessions`);
    }

    return deletedCount;
  }

  // Private helper methods

  private calculateDefaultExpiration(): Date {
    const expiration = new Date();
    expiration.setHours(
      expiration.getHours() + this.config.defaultExpirationHours,
    );
    return expiration;
  }

  private isSessionExpired(session: Session): boolean {
    return new Date() > session.expiresAt;
  }

  private getCacheKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private async cacheSession(
    session: SessionWithUser | Session,
  ): Promise<void> {
    try {
      const cacheData: SessionCacheData = {
        id: session.id,
        userId: session.userId,
        status: session.status,
        context: session.context,
        lastActivity: session.lastActivity.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      };

      const cacheKey = this.getCacheKey(session.id);
      await this.redisService.set(
        cacheKey,
        JSON.stringify(cacheData),
        this.config.cacheExpirationSeconds,
      );
    } catch (error) {
      this.logger.warn(`Failed to cache session ${session.id}:`, error);
    }
  }

  private async getCachedSession(
    sessionId: string,
  ): Promise<SessionWithUser | null> {
    try {
      const cacheKey = this.getCacheKey(sessionId);
      const cachedData = await this.redisService.get(cacheKey);

      if (!cachedData) {
        return null;
      }

      const sessionData: SessionCacheData = JSON.parse(cachedData);

      // Check if cached session is expired
      if (new Date() > new Date(sessionData.expiresAt)) {
        await this.removeCachedSession(sessionId);
        return null;
      }

      // Note: This returns a partial session object from cache
      // For full session with user data, we'd need to cache user info too
      // or fetch from database. For now, return null to force DB lookup
      return null;
    } catch (error) {
      this.logger.warn(`Failed to get cached session ${sessionId}:`, error);
      return null;
    }
  }

  private async removeCachedSession(sessionId: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(sessionId);
      await this.redisService.del(cacheKey);
    } catch (error) {
      this.logger.warn(`Failed to remove cached session ${sessionId}:`, error);
    }
  }
}
