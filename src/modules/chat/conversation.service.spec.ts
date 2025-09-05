import { ConversationService } from './conversation.service';
import {
  ConversationRepository,
  PaginatedResult,
} from './conversation.repository';
import { ConversationMessage, MessageRole } from '@prisma/client';

describe('ConversationService', () => {
  let service: ConversationService;
  let repo: jest.Mocked<ConversationRepository>;

  beforeEach(() => {
    repo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdWithSession: jest.fn(),
      findBySessionId: jest.fn(),
      findRecentBySessionId: jest.fn(),
      countBySessionId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteBySessionId: jest.fn(),
      findMessagesSince: jest.fn(),
      getConversationHistory: jest.fn(),
      listBySession: jest.fn(),
      createBatch: jest.fn(),
    } as unknown as jest.Mocked<ConversationRepository>;

    service = new ConversationService(repo);
  });

  it('appendUserMessage trims and persists via repo.create', async () => {
    const mockMsg = {
      id: 'm1',
      sessionId: 's1',
      role: MessageRole.USER,
      content: 'hello',
      metadata: null,
      timestamp: new Date(),
    } as unknown as ConversationMessage;

    repo.create.mockResolvedValueOnce(mockMsg);

    const saved = await service.appendUserMessage('s1', '  hello  ');
    expect(saved).toBe(mockMsg);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        session: { connect: { id: 's1' } },
        role: MessageRole.USER,
        content: 'hello',
      }),
    );
  });

  it('appendAssistantMessage rejects empty content', async () => {
    await expect(
      service.appendAssistantMessage('s1', '   '),
    ).rejects.toBeTruthy();
  });

  it('getHistory delegates to repo.listBySession with options', async () => {
    const paged: PaginatedResult<ConversationMessage> = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
      hasNext: false,
      hasPrev: false,
    };
    (repo.listBySession as jest.Mock).mockResolvedValueOnce(paged);

    const res = await service.getHistory('s1', {
      page: 2,
      pageSize: 25,
      order: 'desc',
    });
    expect(res).toBe(paged);
    expect(repo.listBySession).toHaveBeenCalledWith('s1', {
      page: 2,
      pageSize: 25,
      order: 'desc',
    });
  });
});
