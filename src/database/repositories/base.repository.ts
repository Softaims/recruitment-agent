import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export abstract class BaseRepository<T> {
  constructor(protected readonly prisma: PrismaService) {}

  abstract create(data: any): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract update(id: string, data: any): Promise<T>;
  abstract delete(id: string): Promise<void>;
}
