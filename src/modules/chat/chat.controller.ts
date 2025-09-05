import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import type { ConversationMessage, User } from '@prisma/client';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HttpUser } from '../auth/decorators/http-user.decorator';
import { ApiResponse } from '../../common/responses/api-response';
import { CreateMessageDto, MessageResponseDto } from './dto/create-message.dto';
import { SendMessageDto } from './dto/chat-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions/:sessionId/messages')
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() sendMessageDto: SendMessageDto,
    @HttpUser() user: User,
  ): Promise<ApiResponse<MessageResponseDto>> {
    const createMessageDto: CreateMessageDto = {
      content: sendMessageDto.content,
      role: 'USER',
      metadata: sendMessageDto.metadata,
    };

    const message = await this.chatService.createMessage(
      sessionId,
      createMessageDto,
    );

    const response: MessageResponseDto = {
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      metadata: message.metadata as Record<string, any>,
      timestamp: message.timestamp,
    };

    return ApiResponse.success(response, 'Message sent successfully');
  }

  @Get('sessions/:sessionId/messages')
  async getMessages(
    @Param('sessionId') sessionId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
    @Query('offset', new ParseIntPipe({ optional: true })) offset = 0,
    @HttpUser() user: User,
  ): Promise<ApiResponse<MessageResponseDto[]>> {
    const messages = await this.chatService.getConversationHistory(
      sessionId,
      limit,
      offset,
    );

    const response: MessageResponseDto[] = messages.map((message) => ({
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      metadata: message.metadata as Record<string, any>,
      timestamp: message.timestamp,
    }));

    return ApiResponse.success(response, 'Messages retrieved successfully');
  }

  @Get('sessions/:sessionId/messages/recent')
  async getRecentMessages(
    @Param('sessionId') sessionId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @HttpUser() user: User,
  ): Promise<ApiResponse<MessageResponseDto[]>> {
    const messages = await this.chatService.getRecentMessages(sessionId, limit);

    const response: MessageResponseDto[] = messages.map((message) => ({
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      metadata: message.metadata as Record<string, any>,
      timestamp: message.timestamp,
    }));

    return ApiResponse.success(
      response,
      'Recent messages retrieved successfully',
    );
  }

  @Get('messages/:messageId')
  async getMessage(
    @Param('messageId') messageId: string,
    @HttpUser() user: User,
  ): Promise<ApiResponse<MessageResponseDto>> {
    const message = await this.chatService.getMessage(messageId);

    const response: MessageResponseDto = {
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      metadata: message.metadata as Record<string, any>,
      timestamp: message.timestamp,
    };

    return ApiResponse.success(response, 'Message retrieved successfully');
  }

  @Put('messages/:messageId')
  async updateMessage(
    @Param('messageId') messageId: string,
    @Body() updateData: { content: string; metadata?: Record<string, any> },
    @HttpUser() user: User,
  ): Promise<ApiResponse<MessageResponseDto>> {
    const message = await this.chatService.updateMessage(
      messageId,
      updateData.content,
      updateData.metadata,
    );

    const response: MessageResponseDto = {
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      metadata: message.metadata as Record<string, any>,
      timestamp: message.timestamp,
    };

    return ApiResponse.success(response, 'Message updated successfully');
  }

  @Delete('messages/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @HttpUser() user: User,
  ): Promise<ApiResponse<null>> {
    await this.chatService.deleteMessage(messageId);
    return ApiResponse.success(null, 'Message deleted successfully');
  }

  @Get('sessions/:sessionId/messages/count')
  async getMessageCount(
    @Param('sessionId') sessionId: string,
    @HttpUser() user: User,
  ): Promise<ApiResponse<{ count: number }>> {
    const count = await this.chatService.getMessageCount(sessionId);
    return ApiResponse.success(
      { count },
      'Message count retrieved successfully',
    );
  }

  @Delete('sessions/:sessionId/messages')
  async clearConversation(
    @Param('sessionId') sessionId: string,
    @HttpUser() user: User,
  ): Promise<ApiResponse<{ deletedCount: number }>> {
    const deletedCount = await this.chatService.clearConversation(sessionId);
    return ApiResponse.success(
      { deletedCount },
      'Conversation cleared successfully',
    );
  }
}
