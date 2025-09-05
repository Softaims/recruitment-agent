import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsScheduler } from './sessions.scheduler';
import { SessionRepository } from '../../database/repositories/session.repository';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [SessionsController],
  providers: [
    SessionsService,
    SessionsScheduler,
    SessionRepository,
  ],
  exports: [SessionsService],
})
export class SessionsModule {}