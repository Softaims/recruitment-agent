import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { HttpUser } from './decorators/http-user.decorator';
import { LoginDto, RegisterDto } from './dto';
import {
  ApiResponse,
  ApiResponseInterface,
} from '../../common/responses/api-response';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponseInterface<Omit<User, 'password'>>> {
    const { user, token } = await this.authService.validateUser(loginDto);

    // Primary: Set HTTP-only cookie
    response.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return ApiResponse.success(user, 'Login successful');
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponseInterface<Omit<User, 'password'>>> {
    const { user, token } = await this.authService.registerUser(registerDto);

    // Primary: Set HTTP-only cookie
    response.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return ApiResponse.success(user, 'Registration successful');
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(
    @HttpUser() user: User,
  ): Promise<ApiResponseInterface<Omit<User, 'password'>>> {
    const profile = await this.authService.getUserProfile(user.id);
    return ApiResponse.success(profile, 'Profile retrieved successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponseInterface<null>> {
    // Clear the JWT cookie
    response.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return ApiResponse.success(null, 'Logout successful');
  }
}
