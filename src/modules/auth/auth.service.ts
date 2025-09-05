import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';
import { Assert } from '../../common/utils/assert.util';
import { CustomException } from '../../common/exceptions/custom.exception';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthResult {
  user: Omit<User, 'password'>;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(loginDto: LoginDto): Promise<AuthResult> {
    Assert.isEmail(loginDto.email, 'Invalid email format');
    Assert.notEmpty(loginDto.password, 'Password is required');

    const user = await this.authRepository.findUserByEmail(loginDto.email);
    if (!user) {
      throw CustomException.new('INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isValidPassword) {
      throw CustomException.new('INVALID_CREDENTIALS', 'Invalid credentials');
    }

    // Update last login
    await this.authRepository.updateUserLastLogin(user.id);

    const token = this.generateToken(user);
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async registerUser(registerDto: RegisterDto): Promise<AuthResult> {
    Assert.isEmail(registerDto.email, 'Invalid email format');
    Assert.minLength(
      registerDto.password,
      8,
      'Password must be at least 8 characters',
    );
    Assert.notEmpty(registerDto.name, 'Name is required');

    const existingUser = await this.authRepository.findUserByEmail(
      registerDto.email,
    );
    if (existingUser) {
      throw CustomException.new(
        'USER_EXISTS',
        'User already exists with this email',
      );
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.authRepository.createUser({
      email: registerDto.email,
      name: registerDto.name,
      password: hashedPassword,
      preferences: registerDto.preferences || {},
    });

    const token = this.generateToken(user);
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async validateUserById(
    userId: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.sign(payload);
  }

  async getUserProfile(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.authRepository.findUserWithSessions(userId);
    if (!user) {
      return null;
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
