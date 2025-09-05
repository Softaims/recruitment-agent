import { Session, User, ConversationMessage } from '@prisma/client';

export type SessionWithUser = Session & {
  user: User;
};

export type SessionWithMessages = Session & {
  user: User;
  messages: ConversationMessage[];
};

export interface SessionCacheData {
  id: string;
  userId: string;
  status: string;
  context: any;
  lastActivity: string;
  expiresAt: string;
}

export interface SessionConfig {
  defaultExpirationHours: number;
  cacheExpirationSeconds: number;
  maxActiveSessions: number;
  cleanupIntervalMinutes: number;
}