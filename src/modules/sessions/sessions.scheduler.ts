import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionsService } from './sessions.service';

@Injectable()
export class SessionsScheduler {
  private readonly logger = new Logger(SessionsScheduler.name);

  constructor(private readonly sessionsService: SessionsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredSessionsCleanup(): Promise<void> {
    try {
      this.logger.log('Starting expired sessions cleanup...');

      const expiredCount = await this.sessionsService.cleanupExpiredSessions();

      if (expiredCount > 0) {
        this.logger.log(`Cleaned up ${expiredCount} expired sessions`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleOldSessionsDeletion(): Promise<void> {
    try {
      this.logger.log('Starting old expired sessions deletion...');

      const deletedCount =
        await this.sessionsService.deleteOldExpiredSessions(30);

      if (deletedCount > 0) {
        this.logger.log(`Deleted ${deletedCount} old expired sessions`);
      }
    } catch (error) {
      this.logger.error('Failed to delete old expired sessions:', error);
    }
  }
}
