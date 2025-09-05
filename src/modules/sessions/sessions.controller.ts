import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HttpUser } from '../../common/decorators/http-user.decorator';
import { ApiResponse } from '../../common/responses/api-response';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import type { User } from '@prisma/client';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  async createSession(
    @HttpUser() user: User,
    @Body() createSessionDto?: CreateSessionDto,
  ) {
    const session = await this.sessionsService.createSession(
      user.id,
      createSessionDto,
    );
    return ApiResponse.success(session, 'Session created successfully');
  }

  @Get()
  async getUserSessions(
    @HttpUser() user: User,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const sessions = await this.sessionsService.getUserSessions(
      user.id,
      skip ? parseInt(skip, 10) : 0,
      take ? parseInt(take, 10) : 50,
    );
    return ApiResponse.success(sessions, 'Sessions retrieved successfully');
  }

  @Get('active')
  async getActiveSessions(@HttpUser() user: User) {
    const sessions = await this.sessionsService.getActiveSessions(user.id);
    return ApiResponse.success(
      sessions,
      'Active sessions retrieved successfully',
    );
  }

  @Get(':id')
  async getSession(@Param('id') sessionId: string) {
    const session = await this.sessionsService.getSession(sessionId);
    if (!session) {
      return ApiResponse.error('SESSION_NOT_FOUND', 'Session not found');
    }
    return ApiResponse.success(session, 'Session retrieved successfully');
  }

  @Get(':id/messages')
  async getSessionWithMessages(@Param('id') sessionId: string) {
    const session =
      await this.sessionsService.getSessionWithMessages(sessionId);
    if (!session) {
      return ApiResponse.error('SESSION_NOT_FOUND', 'Session not found');
    }
    return ApiResponse.success(
      session,
      'Session with messages retrieved successfully',
    );
  }

  @Put(':id')
  async updateSession(
    @Param('id') sessionId: string,
    @Body() updateSessionDto: UpdateSessionDto,
  ) {
    const session = await this.sessionsService.updateSession(
      sessionId,
      updateSessionDto,
    );
    return ApiResponse.success(session, 'Session updated successfully');
  }

  @Put(':id/activity')
  async updateSessionActivity(@Param('id') sessionId: string) {
    const session = await this.sessionsService.updateSessionActivity(sessionId);
    return ApiResponse.success(
      session,
      'Session activity updated successfully',
    );
  }

  @Put(':id/context')
  async updateSessionContext(
    @Param('id') sessionId: string,
    @Body('context') context: any,
  ) {
    const session = await this.sessionsService.updateSessionContext(
      sessionId,
      context,
    );
    return ApiResponse.success(session, 'Session context updated successfully');
  }

  @Delete(':id')
  async deleteSession(@Param('id') sessionId: string) {
    await this.sessionsService.deleteSession(sessionId);
    return ApiResponse.success(null, 'Session deleted successfully');
  }

  @Put(':id/expire')
  async expireSession(@Param('id') sessionId: string) {
    await this.sessionsService.expireSession(sessionId);
    return ApiResponse.success(null, 'Session expired successfully');
  }
}
