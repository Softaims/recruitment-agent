import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UserRepository, SessionRepository } from './repositories';

@Module({
  providers: [PrismaService, UserRepository, SessionRepository],
  exports: [PrismaService, UserRepository, SessionRepository],
})
export class DatabaseModule {}