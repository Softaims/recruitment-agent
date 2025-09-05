import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { ConversationRepository } from './conversation.repository';
import { SessionsModule } from '../sessions/sessions.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [SessionsModule, AuthModule, DatabaseModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ConversationRepository],
  exports: [ChatService, ConversationRepository],
})
export class ChatModule {}