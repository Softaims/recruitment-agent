import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { ConversationRepository } from './conversation.repository';
import { SessionsService } from '../sessions/sessions.service';
import { MessageRole, SessionStatus } from '@prisma/client';

describe('ChatService (Business Logic)', () => {
  let service: ChatService;
  let conversationRepository: jest.Mocked<ConversationRepository>;
  let sessionsService: jest.Mocked<SessionsService>;

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
    const mockConversationRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySessionId: jest.fn(),
      findRecentBySessionId: jest.fn(),
      countBySessionId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteBySessionId: jest.fn(),
      findMessagesSince: jest.fn(),
    };

    const mockSessionsService = {
      getSession: jest.fn(),
      updateSessionActivity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: ConversationRepository,
          useValue: mockConversationRepository,
        },
        {
          provide: SessionsService,
          useValue: mockSessionsService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    conversationRepository = module.get(ConversationRepository);
    sessionsService = module.get(SessionsService);
  });

  describe('processMessage', () => {
    it('should process valid messages', async () => {
      sessionsService.getSession.mockResolvedValue(mockSession);
      sessionsService.updateSessionActivity.mockResolvedValue(mockSession);
      conversationRepository.create.mockResolvedValue(mockMessage);

      const payload = {
        sessionId: 'session-1',
        content: 'Hello, world!',
        role: MessageRole.USER,
        metadata: { test: true },
      };

      const result = await service.processMessage(payload);

      expect(result).toEqual(mockMessage);
      expect(sessionsService.getSession).toHaveBeenCalledWith('session-1');
      expect(sessionsService.updateSessionActivity).toHaveBeenCalledWith(
        'session-1',
      );
      expect(conversationRepository.create).toHaveBeenCalledWith({
        session: { connect: { id: 'session-1' } },
        content: 'Hello, world!',
        role: MessageRole.USER,
        metadata: { test: true },
      });
    });

    it('should throw error for invalid session', async () => {
      sessionsService.getSession.mockResolvedValue(null);

      const payload = {
        sessionId: 'invalid-session',
        content: 'Hello, world!',
        role: MessageRole.USER,
      };

      await expect(service.processMessage(payload)).rejects.toThrow(
        'Session not found or expired',
      );
      expect(conversationRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error for missing session ID', async () => {
      const payload = {
        sessionId: null as any,
        content: 'Hello, world!',
        role: MessageRole.USER,
      };

      await expect(service.processMessage(payload)).rejects.toThrow(
        'Session ID is required',
      );
    });

    it('should throw error for missing content', async () => {
      const payload = {
        sessionId: 'session-1',
        content: null as any,
        role: MessageRole.USER,
      };

      await expect(service.processMessage(payload)).rejects.toThrow(
        'Message content is required',
      );
    });
  });

  describe('createMessage', () => {
    it('should create messages with valid data', async () => {
      sessionsService.getSession.mockResolvedValue(mockSession);
      sessionsService.updateSessionActivity.mockResolvedValue(mockSession);
      conversationRepository.create.mockResolvedValue(mockMessage);

      const createDto = {
        content: 'Hello, world!',
        role: MessageRole.USER,
        metadata: { test: true },
      };

      const result = await service.createMessage('session-1', createDto);

      expect(result).toEqual(mockMessage);
      expect(sessionsService.updateSessionActivity).toHaveBeenCalledWith(
        'session-1',
      );
    });

    it('should create system messages', async () => {
      sessionsService.getSession.mockResolvedValue(mockSession);
      sessionsService.updateSessionActivity.mockResolvedValue(mockSession);

      const systemMessage = { ...mockMessage, role: MessageRole.SYSTEM };
      conversationRepository.create.mockResolvedValue(systemMessage);

      const result = await service.createSystemMessage(
        'session-1',
        'System message',
      );

      expect(result.role).toBe(MessageRole.SYSTEM);
      expect(conversationRepository.create).toHaveBeenCalledWith({
        session: { connect: { id: 'session-1' } },
        content: 'System message',
        role: MessageRole.SYSTEM,
        metadata: {},
      });
    });

    it('should create assistant messages', async () => {
      sessionsService.getSession.mockResolvedValue(mockSession);
      sessionsService.updateSessionActivity.mockResolvedValue(mockSession);

      const assistantMessage = { ...mockMessage, role: MessageRole.ASSISTANT };
      conversationRepository.create.mockResolvedValue(assistantMessage);

      const result = await service.createAssistantMessage(
        'session-1',
        'Assistant response',
      );

      expect(result.role).toBe(MessageRole.ASSISTANT);
      expect(conversationRepository.create).toHaveBeenCalledWith({
        session: { connect: { id: 'session-1' } },
        content: 'Assistant response',
        role: MessageRole.ASSISTANT,
        metadata: {},
      });
    });
  });

  describe('getConversationHistory', () => {
    it('should retrieve conversation history', async () => {
      sessionsService.getSession.mockResolvedValue(mockSession);
      conversationRepository.findBySessionId.mockResolvedValue([mockMessage]);

      const result = await service.getConversationHistory('session-1', 50, 0);

      expect(result).toEqual([mockMessage]);
      expect(conversationRepository.findBySessionId).toHaveBeenCalledWith(
        'session-1',
        50,
        0,
      );
    });

    it('should throw error for invalid session', async () => {
      sessionsService.getSession.mockResolvedValue(null);

      await expect(
        service.getConversationHistory('invalid-session'),
      ).rejects.toThrow('Session not found or expired');
    });
  });

  describe('getRecentMessages', () => {
    it('should retrieve recent messages', async () => {
      sessionsService.getSession.mockResolvedValue(mockSession);
      conversationRepository.findRecentBySessionId.mockResolvedValue([
        mockMessage,
      ]);

      const result = await service.getRecentMessages('session-1', 10);

      expect(result).toEqual([mockMessage]);
      expect(conversationRepository.findRecentBySessionId).toHaveBeenCalledWith(
        'session-1',
        10,
      );
    });
  });

  describe('updateMessage', () => {
    it('should update existing messages', async () => {
      conversationRepository.findById.mockResolvedValue(mockMessage);

      const updatedMessage = { ...mockMessage, content: 'Updated content' };
      conversationRepository.update.mockResolvedValue(updatedMessage);

      const result = await service.updateMessage(
        'message-1',
        'Updated content',
        { updated: true },
      );

      expect(result.content).toBe('Updated content');
      expect(conversationRepository.update).toHaveBeenCalledWith('message-1', {
        content: 'Updated content',
        metadata: { updated: true },
      });
    });

    it('should throw error for non-existent message', async () => {
      conversationRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateMessage('invalid-message', 'content'),
      ).rejects.toThrow('Message not found');
    });
  });

  describe('deleteMessage', () => {
    it('should delete existing messages', async () => {
      conversationRepository.findById.mockResolvedValue(mockMessage);
      conversationRepository.delete.mockResolvedValue(undefined);

      await service.deleteMessage('message-1');

      expect(conversationRepository.delete).toHaveBeenCalledWith('message-1');
    });

    it('should throw error for non-existent message', async () => {
      conversationRepository.findById.mockResolvedValue(null);

      await expect(service.deleteMessage('invalid-message')).rejects.toThrow(
        'Message not found',
      );
    });
  });

  describe('clearConversation', () => {
    it('should clear all messages in session', async () => {
      sessionsService.getSession.mockResolvedValue(mockSession);
      conversationRepository.deleteBySessionId.mockResolvedValue(5);

      const result = await service.clearConversation('session-1');

      expect(result).toBe(5);
      expect(conversationRepository.deleteBySessionId).toHaveBeenCalledWith(
        'session-1',
      );
    });

    it('should throw error for invalid session', async () => {
      sessionsService.getSession.mockResolvedValue(null);

      await expect(
        service.clearConversation('invalid-session'),
      ).rejects.toThrow('Session not found or expired');
    });
  });

  describe('getMessageCount', () => {
    it('should return message count for session', async () => {
      conversationRepository.countBySessionId.mockResolvedValue(10);

      const result = await service.getMessageCount('session-1');

      expect(result).toBe(10);
      expect(conversationRepository.countBySessionId).toHaveBeenCalledWith(
        'session-1',
      );
    });
  });

  describe('getMessagesSince', () => {
    it('should retrieve messages since specific date', async () => {
      const since = new Date('2024-01-01');
      conversationRepository.findMessagesSince.mockResolvedValue([mockMessage]);

      const result = await service.getMessagesSince('session-1', since);

      expect(result).toEqual([mockMessage]);
      expect(conversationRepository.findMessagesSince).toHaveBeenCalledWith(
        'session-1',
        since,
      );
    });
  });
});
