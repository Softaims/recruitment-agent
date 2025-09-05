import { IsOptional, IsObject, IsDateString } from 'class-validator';
import { Prisma } from '@prisma/client';

export class CreateSessionDto implements Pick<Prisma.SessionCreateInput, 'context'> {
  @IsOptional()
  @IsObject()
  context?: any;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}