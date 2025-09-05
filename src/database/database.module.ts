import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UserRepository, SessionRepository } from './repositories';
import { RedisService } from './redis.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [PrismaService, UserRepository, SessionRepository, RedisService],
  exports: [PrismaService, UserRepository, SessionRepository, RedisService],
})
export class DatabaseModule {}
