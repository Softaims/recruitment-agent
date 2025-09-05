import { IsString, IsNumber, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class EnvironmentVariables {
  // Application Configuration
  @IsIn(['development', 'test', 'staging', 'production'])
  NODE_ENV: string = 'development';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  PORT: number = 3000;

  // Database Configuration
  @IsString()
  DATABASE_URL: string;

  // JWT Configuration
  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '7d';

  // Redis Configuration
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD: string = '';

  // LLM Configuration
  @IsString()
  @IsOptional()
  OPENROUTER_API_KEY: string;

  @IsString()
  @IsOptional()
  DEFAULT_LLM_MODEL: string = 'openai/gpt-4';

  // Search Configuration
  @IsString()
  @IsOptional()
  TAVILY_API_KEY: string;

  // Vector Database Configuration
  @IsString()
  @IsOptional()
  VECTOR_DB_URL: string = 'http://localhost:19530';

  @IsString()
  @IsOptional()
  VECTOR_DB_API_KEY: string = '';

  // Session Configuration
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  SESSION_TIMEOUT_MINUTES: number = 30;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  SESSION_DEFAULT_EXPIRATION_HOURS: number = 24;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  SESSION_CACHE_EXPIRATION_SECONDS: number = 3600;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  SESSION_MAX_ACTIVE_SESSIONS: number = 10;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  SESSION_CLEANUP_INTERVAL_MINUTES: number = 60;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  MAX_CONVERSATION_HISTORY: number = 100;

  // Rate Limiting Configuration
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  RATE_LIMIT_TTL: number = 60;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  RATE_LIMIT_LIMIT: number = 100;

  // Monitoring Configuration
  @IsIn(['error', 'warn', 'info', 'debug'])
  @IsOptional()
  LOG_LEVEL: string = 'info';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  ENABLE_METRICS: boolean = true;
}