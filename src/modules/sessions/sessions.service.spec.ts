import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SessionsService } from './sessions.service';
import { SessionRepository } from '../../database/repositories/session.repository';
import { RedisService } from '../../database/redis.service';
import { SessionStatus } from '@prisma/client';

describe('SessionsService', () => {
  let service: SessionsService;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let redisService: jest.Mocked<RedisService>;

  const mockSession = {
    id: 'session-1',
    userId: 'user-1',
    status: SessionStatus.ACTIVE,
    context: {},
    createdAt: new Date(),
    lastActivity: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed',
      preferences: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const mockSessionRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findActiveByUserId: jest.fn(),
      update: jest.fn(),
      updateLastActivity: jest.fn(),
      updateContext: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
      findExpiredSessions: jest.fn(),
      markExpired: jest.fn(),
      deleteExpiredSessions: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config = {
          'app.session.defaultExpirationHours': 24,
          'app.session.cacheExpirationSeconds': 3600,
          'app.session.maxActiveSessions': 10,
          'app.session.cleanupIntervalMinutes': 60,
        };
        return config[key] || defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: SessionRepository, useValue: mockSessionRepository },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    sessionRepository = module.get(SessionRepository);
    redisService = module.get(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      sessionRepository.findActiveByUserId.mockResolvedValue([]);
      sessionRepository.create.mockResolvedValue(mockSession);
      redisService.set.mockResolvedValue();

      const result = await service.createSession('user-1');

      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: { connect: { id: 'user-1' } },
          status: SessionStatus.ACTIVE,
        })
      );
      expect(redisService.set).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('should expire oldest session when max limit reached', async () => {
      const activeSessions = Array(10).fill(mockSession);
      sessionRepository.findActiveByUserId.mockResolvedValue(activeSessions);
      sessionRepository.update.mockResolvedValue(mockSession);
      sessionRepository.create.mockResolvedValue(mockSession);
      redisService.set.mockResolvedValue();
      redisService.del.mockResolvedValue();

      await service.createSession('user-1');

      expect(sessionRepository.update).toHaveBeenCalledWith(
        mockSession.id,
        { status: SessionStatus.EXPIRED }
      );
    });
  });

  describe('getSession', () => {
    it('should return session from database', async () => {
      redisService.get.mockResolvedValue(null);
      sessionRepository.findById.mockResolvedValue(mockSession);
      redisService.set.mockResolvedValue();

      const result = await service.getSession('session-1');

      expect(sessionRepository.findById).toHaveBeenCalledWith('session-1');
      expect(result).toEqual(mockSession);
    });

    it('should return null for expired session', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      };
      
      redisService.get.mockResolvedValue(null);
      sessionRepository.findById.mockResolvedValue(expiredSession);
      sessionRepository.update.mockResolvedValue(expiredSession);
      redisService.del.mockResolvedValue();

      const result = await service.getSession('session-1');

      expect(sessionRepository.update).toHaveBeenCalledWith(
        'session-1',
        { status: SessionStatus.EXPIRED }
      );
      expect(result).toBeNull();
    });
  });

  describe('updateSessionActivity', () => {
    it('should update last activity and cache', async () => {
      const updatedSession = {
        ...mockSession,
        lastActivity: new Date(),
      };
      
      sessionRepository.updateLastActivity.mockResolvedValue(updatedSession);
      redisService.set.mockResolvedValue();

      const result = await service.updateSessionActivity('session-1');

      expect(sessionRepository.updateLastActivity).toHaveBeenCalledWith('session-1');
      expect(redisService.set).toHaveBeenCalled();
      expect(result).toEqual(updatedSession);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      const expiredSessions = [mockSession];
      sessionRepository.findExpiredSessions.mockResolvedValue(expiredSessions);
      sessionRepository.markExpired.mockResolvedValue();
      redisService.del.mockResolvedValue();

      const result = await service.cleanupExpiredSessions();

      expect(sessionRepository.markExpired).toHaveBeenCalledWith(['session-1']);
      expect(redisService.del).toHaveBeenCalledWith('session:session-1');
      expect(result).toBe(1);
    });
  });
});