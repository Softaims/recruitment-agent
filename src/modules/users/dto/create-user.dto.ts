import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { Prisma } from '@prisma/client';

export class CreateUserDto implements Pick<Prisma.UserCreateInput, 'email' | 'name'> {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name cannot be empty' })
  name: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsOptional()
  preferences?: any;
}