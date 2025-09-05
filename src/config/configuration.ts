import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  // Application Configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },

  // LLM Configuration
  llm: {
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    defaultModel: process.env.DEFAULT_LLM_MODEL || 'openai/gpt-4',
  },

  // Search Configuration
  search: {
    tavilyApiKey: process.env.TAVILY_API_KEY,
  },

  // Vector Database Configuration
  vectorDb: {
    url: process.env.VECTOR_DB_URL || 'http://localhost:19530',
    apiKey: process.env.VECTOR_DB_API_KEY || '',
  },

  // Session Configuration
  session: {
    timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES, 10) || 30,
    defaultExpirationHours:
      parseInt(process.env.SESSION_DEFAULT_EXPIRATION_HOURS, 10) || 24,
    cacheExpirationSeconds:
      parseInt(process.env.SESSION_CACHE_EXPIRATION_SECONDS, 10) || 3600,
    maxActiveSessions:
      parseInt(process.env.SESSION_MAX_ACTIVE_SESSIONS, 10) || 10,
    cleanupIntervalMinutes:
      parseInt(process.env.SESSION_CLEANUP_INTERVAL_MINUTES, 10) || 60,
    maxConversationHistory:
      parseInt(process.env.MAX_CONVERSATION_HISTORY, 10) || 100,
  },

  // Rate Limiting Configuration
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
    limit: parseInt(process.env.RATE_LIMIT_LIMIT, 10) || 100,
  },

  // Monitoring Configuration
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    enableMetrics: process.env.ENABLE_METRICS === 'true',
  },
}));
