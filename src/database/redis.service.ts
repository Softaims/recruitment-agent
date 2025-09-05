import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private memoryStore: Map<string, string> | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const isTest = process.env.NODE_ENV === 'test';
    const redisConfig = this.configService.get<{
      host: string;
      port: number;
      password: string;
    }>('app.redis') ?? { host: 'localhost', port: 6379, password: '' };

    if (isTest) {
      // In tests, use a simple in-memory map to avoid external dependency
      this.memoryStore = new Map<string, string>();
      this.logger.log('Using in-memory Redis mock for tests');
      return;
    }

    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password || undefined,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });

    try {
      await this.client.connect();
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  onModuleDestroy(): void {
    if (this.client) {
      this.client.disconnect();
      this.logger.log('Disconnected from Redis');
    }
    if (this.memoryStore) {
      this.memoryStore.clear();
      this.memoryStore = null;
      this.logger.log('Cleared in-memory Redis mock');
    }
  }

  getClient(): Redis {
    // For tests, we return a minimal shim when using memory store
    if (!this.client && this.memoryStore) {
      return {} as unknown as Redis;
    }
    if (this.client) {
      return this.client;
    }
    throw new Error('Redis client not initialized');
  }

  async get(key: string): Promise<string | null> {
    try {
      if (this.memoryStore) {
        return this.memoryStore.get(key) ?? null;
      }
      if (!this.client) throw new Error('Redis client not initialized');
      return await this.client.get(key);
    } catch (error) {
      this.logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (this.memoryStore) {
        this.memoryStore.set(key, value);
        // TTL ignored in simple mock
        return;
      }
      if (!this.client) throw new Error('Redis client not initialized');
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Error setting key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.memoryStore) {
        this.memoryStore.delete(key);
        return;
      }
      if (!this.client) throw new Error('Redis client not initialized');
      await this.client.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (this.memoryStore) {
        return this.memoryStore.has(key);
      }
      if (!this.client) throw new Error('Redis client not initialized');
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      if (this.memoryStore) {
        // TTL ignored in simple mock
        return;
      }
      if (!this.client) throw new Error('Redis client not initialized');
      await this.client.expire(key, ttlSeconds);
    } catch (error) {
      this.logger.error(`Error setting expiration for key ${key}:`, error);
      throw error;
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    try {
      if (this.memoryStore) {
        const raw = this.memoryStore.get(key);
        if (!raw) return null;
        const obj = JSON.parse(raw) as Record<string, string>;
        return obj[field] ?? null;
      }
      if (!this.client) throw new Error('Redis client not initialized');
      return await this.client.hget(key, field);
    } catch (error) {
      this.logger.error(
        `Error getting hash field ${field} from key ${key}:`,
        error,
      );
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    try {
      if (this.memoryStore) {
        const raw = this.memoryStore.get(key);
        const obj = raw ? (JSON.parse(raw) as Record<string, string>) : {};
        obj[field] = value;
        this.memoryStore.set(key, JSON.stringify(obj));
        return;
      }
      if (!this.client) throw new Error('Redis client not initialized');
      await this.client.hset(key, field, value);
    } catch (error) {
      this.logger.error(
        `Error setting hash field ${field} in key ${key}:`,
        error,
      );
      throw error;
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    try {
      if (this.memoryStore) {
        const raw = this.memoryStore.get(key);
        if (!raw) return;
        const obj = JSON.parse(raw) as Record<string, string>;
        delete obj[field];
        this.memoryStore.set(key, JSON.stringify(obj));
        return;
      }
      if (!this.client) throw new Error('Redis client not initialized');
      await this.client.hdel(key, field);
    } catch (error) {
      this.logger.error(
        `Error deleting hash field ${field} from key ${key}:`,
        error,
      );
      throw error;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      if (this.memoryStore) {
        const raw = this.memoryStore.get(key);
        return raw ? (JSON.parse(raw) as Record<string, string>) : {};
      }
      if (!this.client) throw new Error('Redis client not initialized');
      return await this.client.hgetall(key);
    } catch (error) {
      this.logger.error(
        `Error getting all hash fields from key ${key}:`,
        error,
      );
      return {};
    }
  }
}
