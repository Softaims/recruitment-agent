import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { UsersModule } from './modules/users';
import { AuthModule } from './modules/auth';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    CommonModule,
    AuthModule,
    UsersModule,
    SessionsModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
