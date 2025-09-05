import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';

describe('AppController', () => {
  let app: TestingModule;
  let appController: AppController;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const mockPrismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          'app.nodeEnv': 'test',
          'app.port': 3000,
        };
        return config[key];
      }),
    };

    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    prismaService = app.get<PrismaService>(PrismaService);
  });

  describe('getHello', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('getHealth', () => {
    it('should return healthy status when database is connected', async () => {
      const result = await appController.getHealth();

      expect(result.status).toBe('healthy');
      expect(result.environment).toBe('test');
      expect(result.services.database).toBe('connected');
      expect(prismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should return unhealthy status when database connection fails', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockRejectedValueOnce(new Error('Connection failed'));

      const result = await appController.getHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database).toBe('disconnected');
      expect(result.error).toBe('Connection failed');
    });
  });
});
