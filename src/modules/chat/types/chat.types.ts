import { ConversationMessage, Session, User } from '@prisma/client';

export interface ConversationMessageWithSession extends ConversationMessage {
  session: Session;
}

export interface SessionWithMessages extends Session {
  messages: ConversationMessage[];
  user: User;
}

export interface ChatConnectionData {
  userId: string;
  sessionId?: string;
  connectedAt: Date;
}

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'error' | 'system';
  data: any;
  timestamp: Date;
}

export interface TypingIndicator {
  sessionId: string;
  userId: string;
  isTyping: boolean;
}