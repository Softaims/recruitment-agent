import { IsOptional, IsObject, IsEnum, IsDateString } from 'class-validator';
import { SessionStatus, Prisma } from '@prisma/client';

export class UpdateSessionDto implements Partial<Pick<Prisma.SessionUpdateInput, 'context' | 'status' | 'expiresAt'>> {
  @IsOptional()
  @IsObject()
  context?: any;

  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}