import { Injectable } from '@nestjs/common';
import { ConversationMessage, MessageRole, Prisma } from '@prisma/client';
import { Assert } from '../../common/utils/assert.util';
import {
  ConversationRepository,
  ListMessagesOptions,
  PaginatedResult,
  ConversationSummaryResult,
} from './conversation.repository';

export interface AppendMessageParams {
  sessionId: string;
  content: string;
  role: MessageRole;
  metadata?: Prisma.JsonValue | null;
}

@Injectable()
export class ConversationService {
  constructor(private readonly repo: ConversationRepository) {}

  async appendMessage(
    params: AppendMessageParams,
  ): Promise<ConversationMessage> {
    Assert.notNull(params.sessionId, 'Session ID is required');
    Assert.notNull(params.role, 'Message role is required');
    Assert.notNull(params.content, 'Message content is required');
    Assert.notEmpty(params.content, 'Message content must not be empty');

    const content = params.content.trim();

    const data: Prisma.ConversationMessageCreateInput = {
      session: { connect: { id: params.sessionId } },
      role: params.role,
      content,
      metadata: params.metadata ?? {},
    };

    return this.repo.create(data);
  }

  async appendUserMessage(
    sessionId: string,
    content: string,
    metadata?: Prisma.JsonValue | null,
  ): Promise<ConversationMessage> {
    return this.appendMessage({
      sessionId,
      content,
      role: MessageRole.USER,
      metadata,
    });
  }

  async appendAssistantMessage(
    sessionId: string,
    content: string,
    metadata?: Prisma.JsonValue | null,
  ): Promise<ConversationMessage> {
    return this.appendMessage({
      sessionId,
      content,
      role: MessageRole.ASSISTANT,
      metadata,
    });
  }

  async getHistory(
    sessionId: string,
    options: ListMessagesOptions = {},
  ): Promise<PaginatedResult<ConversationMessage>> {
    Assert.notNull(sessionId, 'Session ID is required');
    return this.repo.listBySession(sessionId, options);
  }

  async getLatestSummary(
    sessionId: string,
  ): Promise<ConversationSummaryResult> {
    Assert.notNull(sessionId, 'Session ID is required');
    return this.repo.getLatestSummary(sessionId);
  }
}
