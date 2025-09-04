import { User } from '@prisma/client';

export class UserResponseDto implements Pick<User, 'id' | 'email' | 'name' | 'preferences' | 'createdAt' | 'updatedAt'> {
  id: string;
  email: string;
  name: string;
  preferences: any;
  createdAt: Date;
  updatedAt: Date;
}