import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { MessageRole } from '@prisma/client';

describe('ChatController (Integration)', () => {
  let controller: ChatController;
  let chatService: jest.Mocked<ChatService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedpassword',
    preferences: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage = {
    id: 'message-1',
    sessionId: 'session-1',
    role: MessageRole.USER,
    content: 'Hello, world!',
    metadata: { test: true },
    timestamp: new Date(),
  };

  beforeEach(async () => {
    const mockChatService = {
      createMessage: jest.fn(),
      getConversationHistory: jest.fn(),
      getRecentMessages: jest.fn(),
      getMessage: jest.fn(),
      updateMessage: jest.fn(),
      deleteMessage: jest.fn(),
      getMessageCount: jest.fn(),
      clearConversation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    chatService = module.get(ChatService);
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      chatService.createMessage.mockResolvedValue(mockMessage);

      const sendMessageDto = {
        content: 'Hello, world!',
        metadata: { test: true },
      };

      const result = await controller.sendMessage(
        'session-1',
        sendMessageDto,
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(result.data.content).toBe('Hello, world!');
      expect(result.data.role).toBe(MessageRole.USER);
      expect(result.message).toBe('Message sent successfully');

      expect(chatService.createMessage).toHaveBeenCalledWith('session-1', {
        content: 'Hello, world!',
        role: 'USER',
        metadata: { test: true },
      });
    });
  });

  describe('getMessages', () => {
    it('should retrieve messages with default pagination', async () => {
      chatService.getConversationHistory.mockResolvedValue([mockMessage]);

      const result = await controller.getMessages(
        'session-1',
        undefined,
        undefined,
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].content).toBe('Hello, world!');
      expect(result.message).toBe('Messages retrieved successfully');

      expect(chatService.getConversationHistory).toHaveBeenCalledWith(
        'session-1',
        50,
        0,
      );
    });

    it('should retrieve messages with custom pagination', async () => {
      chatService.getConversationHistory.mockResolvedValue([mockMessage]);

      const result = await controller.getMessages(
        'session-1',
        20,
        10,
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(chatService.getConversationHistory).toHaveBeenCalledWith(
        'session-1',
        20,
        10,
      );
    });
  });

  describe('getRecentMessages', () => {
    it('should retrieve recent messages with default limit', async () => {
      chatService.getRecentMessages.mockResolvedValue([mockMessage]);

      const result = await controller.getRecentMessages(
        'session-1',
        undefined,
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.message).toBe('Recent messages retrieved successfully');

      expect(chatService.getRecentMessages).toHaveBeenCalledWith(
        'session-1',
        10,
      );
    });

    it('should retrieve recent messages with custom limit', async () => {
      chatService.getRecentMessages.mockResolvedValue([mockMessage]);

      const result = await controller.getRecentMessages(
        'session-1',
        5,
        mockUser,
      );

      expect(chatService.getRecentMessages).toHaveBeenCalledWith(
        'session-1',
        5,
      );
    });
  });

  describe('getMessage', () => {
    it('should retrieve single message', async () => {
      chatService.getMessage.mockResolvedValue(mockMessage);

      const result = await controller.getMessage('message-1', mockUser);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('message-1');
      expect(result.data.content).toBe('Hello, world!');
      expect(result.message).toBe('Message retrieved successfully');

      expect(chatService.getMessage).toHaveBeenCalledWith('message-1');
    });
  });

  describe('updateMessage', () => {
    it('should update message content', async () => {
      const updatedMessage = { ...mockMessage, content: 'Updated content' };
      chatService.updateMessage.mockResolvedValue(updatedMessage);

      const updateData = {
        content: 'Updated content',
        metadata: { updated: true },
      };

      const result = await controller.updateMessage(
        'message-1',
        updateData,
        mockUser,
      );

      expect(result.success).toBe(true);
      expect(result.data.content).toBe('Updated content');
      expect(result.message).toBe('Message updated successfully');

      expect(chatService.updateMessage).toHaveBeenCalledWith(
        'message-1',
        'Updated content',
        { updated: true },
      );
    });
  });

  describe('deleteMessage', () => {
    it('should delete message', async () => {
      chatService.deleteMessage.mockResolvedValue(undefined);

      const result = await controller.deleteMessage('message-1', mockUser);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.message).toBe('Message deleted successfully');

      expect(chatService.deleteMessage).toHaveBeenCalledWith('message-1');
    });
  });

  describe('getMessageCount', () => {
    it('should return message count', async () => {
      chatService.getMessageCount.mockResolvedValue(15);

      const result = await controller.getMessageCount('session-1', mockUser);

      expect(result.success).toBe(true);
      expect(result.data.count).toBe(15);
      expect(result.message).toBe('Message count retrieved successfully');

      expect(chatService.getMessageCount).toHaveBeenCalledWith('session-1');
    });
  });

  describe('clearConversation', () => {
    it('should clear conversation', async () => {
      chatService.clearConversation.mockResolvedValue(10);

      const result = await controller.clearConversation('session-1', mockUser);

      expect(result.success).toBe(true);
      expect(result.data.deletedCount).toBe(10);
      expect(result.message).toBe('Conversation cleared successfully');

      expect(chatService.clearConversation).toHaveBeenCalledWith('session-1');
    });
  });
});
