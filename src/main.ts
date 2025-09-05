import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Enable validation pipes globally
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Enable CORS
    app.enableCors({
      origin: process.env.NODE_ENV === 'production' ? false : true,
      credentials: true,
    });

    const port = configService.get<number>('app.port') || 3000;

    await app.listen(port);

    logger.log(`Application is running on: http://localhost:${port}`);
    logger.log(`Environment: ${configService.get<string>('app.nodeEnv')}`);
  } catch (error) {
    logger.error('Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();
