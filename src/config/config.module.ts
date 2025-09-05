import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';
import configuration from './configuration';
import { EnvironmentVariables } from './validation.schema';

function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Configuration validation failed: ${errorMessages}`);
  }

  return validatedConfig;
}

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env.test', '.env.local', '.env'],
      cache: true,
    }),
  ],
})
export class ConfigModule {}
