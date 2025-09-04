import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiResponse } from '../../common/responses/api-response';
import { CreateUserDto, UpdateUserDto, UpdatePreferencesDto, UserResponseDto } from './dto';

@Controller('users')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.createUser(createUserDto);
    return ApiResponse.success(user, 'User created successfully');
  }

  @Get(':id')
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return ApiResponse.success(user, 'User retrieved successfully');
  }

  @Get()
  async getAllUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '50'
  ) {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    
    const result = await this.usersService.findAllUsers(pageNum, limitNum);
    return ApiResponse.success(result, 'Users retrieved successfully');
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    const user = await this.usersService.updateUser(id, updateUserDto);
    return ApiResponse.success(user, 'User updated successfully');
  }

  @Patch(':id/preferences')
  async updateUserPreferences(
    @Param('id') id: string,
    @Body() preferencesDto: UpdatePreferencesDto
  ) {
    const user = await this.usersService.updatePreferences(id, preferencesDto);
    return ApiResponse.success(user, 'User preferences updated successfully');
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    await this.usersService.deleteUser(id);
    return ApiResponse.success(null, 'User deleted successfully');
  }

  @Get(':id/sessions')
  async getUserWithSessions(@Param('id') id: string) {
    const user = await this.usersService.findUserWithSessions(id);
    return ApiResponse.success(user, 'User with sessions retrieved successfully');
  }

  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    return ApiResponse.success(user, 'User retrieved successfully');
  }
}