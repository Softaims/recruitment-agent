import { IsString, IsNotEmpty, IsOptional, IsObject, IsEnum } from 'class-validator';
import { MessageRole, Prisma } from '@prisma/client';

export class CreateMessageDto implements Pick<Prisma.ConversationMessageCreateInput, 'content' | 'role' | 'metadata'> {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(MessageRole)
  role: MessageRole;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class MessageResponseDto {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}