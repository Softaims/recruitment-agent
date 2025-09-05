import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsObject,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name is required' })
  name: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsOptional()
  @IsObject({ message: 'Preferences must be an object' })
  preferences?: Record<string, any>;
}
