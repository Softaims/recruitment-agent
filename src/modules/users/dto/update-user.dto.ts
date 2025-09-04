import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { Prisma } from '@prisma/client';

export class UpdateUserDto implements Partial<Pick<Prisma.UserUpdateInput, 'email' | 'name' | 'preferences'>> {
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name cannot be empty' })
  name?: string;

  @IsOptional()
  preferences?: any;
}