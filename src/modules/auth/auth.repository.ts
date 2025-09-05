import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async updateUserLastLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        updatedAt: new Date(),
      },
    });
  }

  async findUserWithSessions(
    id: string,
  ): Promise<(User & { sessions: any[] }) | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        sessions: {
          where: {
            status: 'ACTIVE',
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }
}
