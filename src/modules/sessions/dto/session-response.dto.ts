import {
  Session,
  SessionStatus,
  User,
  ConversationMessage,
} from '@prisma/client';

export class SessionResponseDto
  implements
    Pick<
      Session,
      'id' | 'status' | 'context' | 'createdAt' | 'lastActivity' | 'expiresAt'
    >
{
  id: string;
  status: SessionStatus;
  context: any;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
}

export class SessionWithUserDto extends SessionResponseDto {
  user: Pick<User, 'id' | 'email' | 'name'>;
}

export class SessionWithMessagesDto extends SessionResponseDto {
  user: Pick<User, 'id' | 'email' | 'name'>;
  messages: ConversationMessage[];
}
