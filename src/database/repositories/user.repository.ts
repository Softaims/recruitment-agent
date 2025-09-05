import { Injectable } from '@nestjs/common';
import { User, Prisma, Session } from '@prisma/client';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async findWithSessions(
    userId: string,
  ): Promise<(User & { sessions: Session[] }) | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findByEmailWithSessions(
    email: string,
  ): Promise<(User & { sessions: Session[] }) | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async updatePreferences(id: string, preferences: any): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { preferences },
    });
  }

  async findAll(skip = 0, take = 50): Promise<User[]> {
    return this.prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }
}
