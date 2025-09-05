import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsEnum,
} from 'class-validator';
import { MessageRole } from '@prisma/client';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(MessageRole)
  role: MessageRole;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
