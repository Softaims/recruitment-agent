import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../../database/repositories';
import { Assert } from '../../common/utils/assert.util';
import { CreateUserDto, UpdateUserDto, UpdatePreferencesDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // Business logic validation
    Assert.isEmail(createUserDto.email, 'Invalid email format');
    Assert.minLength(createUserDto.password, 8, 'Password must be at least 8 characters');
    Assert.minLength(createUserDto.name.trim(), 1, 'Name cannot be empty');

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);
    Assert.isNull(existingUser, 'User with this email already exists');

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user with default preferences
    const userData = {
      email: createUserDto.email.toLowerCase().trim(),
      name: createUserDto.name.trim(),
      password: hashedPassword,
      preferences: createUserDto.preferences || {
        communicationStyle: 'casual',
        industryFocus: [],
        experienceLevels: [],
        defaultSearchFilters: {}
      }
    };

    return this.userRepository.create(userData);
  }

  async findById(id: string): Promise<User> {
    Assert.notNull(id, 'User ID is required');
    
    const user = await this.userRepository.findById(id);
    Assert.notNull(user, 'User not found');
    
    return user;
  }

  async findByEmail(email: string): Promise<User> {
    Assert.isEmail(email, 'Invalid email format');
    
    const user = await this.userRepository.findByEmail(email.toLowerCase().trim());
    Assert.notNull(user, 'User not found');
    
    return user;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    Assert.notNull(id, 'User ID is required');

    // Verify user exists
    const existingUser = await this.userRepository.findById(id);
    Assert.notNull(existingUser, 'User not found');

    // Validate email if provided
    if (updateUserDto.email) {
      Assert.isEmail(updateUserDto.email, 'Invalid email format');
      
      // Check if email is already taken by another user
      const userWithEmail = await this.userRepository.findByEmail(updateUserDto.email);
      if (userWithEmail && userWithEmail.id !== id) {
        Assert.isNull(userWithEmail, 'Email is already taken by another user');
      }
    }

    // Validate name if provided
    if (updateUserDto.name) {
      Assert.minLength(updateUserDto.name.trim(), 1, 'Name cannot be empty');
    }

    // Prepare update data
    const updateData: any = {};
    if (updateUserDto.email) {
      updateData.email = updateUserDto.email.toLowerCase().trim();
    }
    if (updateUserDto.name) {
      updateData.name = updateUserDto.name.trim();
    }
    if (updateUserDto.preferences) {
      updateData.preferences = updateUserDto.preferences;
    }

    return this.userRepository.update(id, updateData);
  }

  async updatePreferences(id: string, preferencesDto: UpdatePreferencesDto): Promise<User> {
    Assert.notNull(id, 'User ID is required');

    // Verify user exists
    const existingUser = await this.userRepository.findById(id);
    Assert.notNull(existingUser, 'User not found');

    // Merge with existing preferences
    const currentPreferences = (existingUser.preferences as any) || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...preferencesDto
    };

    return this.userRepository.updatePreferences(id, updatedPreferences);
  }

  async deleteUser(id: string): Promise<void> {
    Assert.notNull(id, 'User ID is required');

    // Verify user exists
    const existingUser = await this.userRepository.findById(id);
    Assert.notNull(existingUser, 'User not found');

    await this.userRepository.delete(id);
  }

  async findUserWithSessions(id: string): Promise<User & { sessions: any[] }> {
    Assert.notNull(id, 'User ID is required');

    const user = await this.userRepository.findWithSessions(id);
    Assert.notNull(user, 'User not found');

    return user;
  }

  async findAllUsers(page = 1, limit = 50): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
    Assert.isTrue(page > 0, 'Page must be greater than 0');
    Assert.isTrue(limit > 0 && limit <= 100, 'Limit must be between 1 and 100');

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userRepository.findAll(skip, limit),
      this.userRepository.count()
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async validateUserCredentials(email: string, password: string): Promise<User> {
    Assert.isEmail(email, 'Invalid email format');
    Assert.notNull(password, 'Password is required');

    const user = await this.userRepository.findByEmail(email.toLowerCase().trim());
    Assert.notNull(user, 'Invalid credentials');

    // Note: This assumes password field exists in User model
    // For now, we'll throw an error since password handling should be in auth module
    throw new Error('Password validation should be handled in the authentication module');
  }
}