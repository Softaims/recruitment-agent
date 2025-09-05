import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    try {
      // Test database connection
      await this.prismaService.$queryRaw`SELECT 1`;

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: this.configService.get<string>('app.nodeEnv'),
        version: '1.0.0',
        services: {
          database: 'connected',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        environment: this.configService.get<string>('app.nodeEnv'),
        version: '1.0.0',
        services: {
          database: 'disconnected',
        },
        error: error.message,
      };
    }
  }
}
