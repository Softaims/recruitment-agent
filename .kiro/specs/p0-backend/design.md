# Design Document

## Overview

The P0 backend design implements a NestJS-based API server that provides core recruitment agent functionality through a modular, topic-agnostic architecture. The system supports real-time chat via WebSockets, integrates with LLM providers through abstraction layers, implements RAG for contextual responses, and provides persistent memory for user profiles and conversation history.

The architecture follows Domain-Driven Design principles with clear separation between core business logic, infrastructure concerns, and external integrations. This design enables future extensibility to other domains while delivering essential recruitment capabilities.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    Client[Web Client] --> Gateway[API Gateway/Load Balancer]
    Gateway --> NestJS[NestJS Application]
    
    NestJS --> Auth[Authentication Module]
    NestJS --> Chat[Chat Module]
    NestJS --> Search[Search Module]
    NestJS --> Profile[Profile Module]
    NestJS --> LLM[LLM Integration Module]
    
    Chat --> SessionService[Session Service]
    Chat --> ConversationService[Conversation Service]
    
    LLM --> OpenRouter[OpenRouter API]
    LLM --> VectorDB[Vector Database]
    
    Search --> SearchAPI[External Search APIs]
    
    Profile --> UserService[User Service]
    Profile --> MemoryService[Memory Service]
    
    SessionService --> Redis[(Redis Cache)]
    ConversationService --> PostgreSQL[(PostgreSQL)]
    UserService --> PostgreSQL
    MemoryService --> VectorDB[(Milvus/Pinecone)]
    
    NestJS --> Monitoring[Monitoring & Logging]
    Monitoring --> Prometheus[Prometheus Metrics]
    Monitoring --> Logs[Structured Logs]
```

### Module Architecture

The application follows NestJS module structure with clear boundaries:

- **Core Module**: Application configuration, health checks, shared utilities
- **Auth Module**: JWT authentication, authorization guards, user management
- **Chat Module**: WebSocket gateway, conversation management, session handling
- **LLM Module**: LLM provider abstraction, RAG implementation, context management
- **Search Module**: External search API integration, result processing
- **Profile Module**: User profiles, memory system, preference learning
- **Database Module**: Prisma configuration, schema definitions, service layer, migration management

## Components and Interfaces

### Three-Layer Architecture Implementation

The system follows strict three-layer architecture:

#### Controllers (Thin Orchestration Layer)
- Route handling and HTTP method mapping (GET, POST, PUT, PATCH, DELETE)
- Request validation using DTOs with class-validator
- Response shaping with ApiResponse patterns
- JWT authentication via @HttpUser() decorator
- No business logic - delegate to services

#### Services (Business Logic Layer)
- Core business logic and validation using Assert/Expect utilities
- Orchestration of multiple repositories for complex operations
- Business rule enforcement and data transformation
- No direct database operations - delegate to repositories

#### Repositories (Data Access Layer)
- All Prisma/database operations with type-safe queries
- Transaction management for related operations
- Database-specific optimizations and indexing
- No business logic - pure data access

### Chat Module Components

#### Chat Controller
```typescript
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  async createSession(@HttpUser() user: User): Promise<ApiResponse<Session>> {
    const session = await this.chatService.createSession(user.id);
    return ApiResponse.success(session, 'Session created successfully');
  }

  @Get('sessions/:id/messages')
  async getMessages(@Param('id') sessionId: string): Promise<ApiResponse<ConversationMessage[]>> {
    const messages = await this.chatService.getConversationHistory(sessionId);
    return ApiResponse.success(messages, 'Messages retrieved successfully');
  }
}
```

#### Chat Service (Business Logic)
```typescript
@Injectable()
export class ChatService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly conversationRepository: ConversationRepository
  ) {}

  async createSession(userId: string): Promise<Session> {
    Assert.notNull(userId, 'User ID is required');
    
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    return this.sessionRepository.create({
      userId,
      status: SessionStatus.ACTIVE,
      expiresAt
    });
  }

  async getConversationHistory(sessionId: string, limit = 50): Promise<ConversationMessage[]> {
    Assert.notNull(sessionId, 'Session ID is required');
    
    const session = await this.sessionRepository.findById(sessionId);
    Assert.notNull(session, 'Session not found');
    
    return this.conversationRepository.findBySessionId(sessionId, limit);
  }
}
```

#### Session Repository (Database Operations)
```typescript
@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SessionCreateInput): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  async findById(id: string): Promise<Session | null> {
    return this.prisma.session.findUnique({
      where: { id },
      include: { user: true }
    });
  }

  async updateLastActivity(id: string): Promise<Session> {
    return this.prisma.session.update({
      where: { id },
      data: { lastActivity: new Date() }
    });
  }
}
```

#### Conversation Repository (Database Operations)
```typescript
@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ConversationMessageCreateInput): Promise<ConversationMessage> {
    return this.prisma.conversationMessage.create({ data });
  }

  async findBySessionId(sessionId: string, limit: number): Promise<ConversationMessage[]> {
    return this.prisma.conversationMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }
}
```

#### WebSocket Gateway
```typescript
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat'
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket): void {
    // Connection handling with session validation
  }

  handleDisconnect(client: Socket): void {
    // Cleanup and session persistence
  }

  @SubscribeMessage('message')
  async handleMessage(client: Socket, payload: ChatMessageDto): Promise<void> {
    // Delegate to service for business logic
    await this.chatService.processMessage(payload);
  }
}
```

### Authentication Module Components

#### Auth Controller (HTTP-only Cookies + Header Fallback)
```typescript
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res() response: Response): Promise<void> {
    const { user, token } = await this.authService.validateUser(loginDto);
    
    // Primary: HTTP-only cookie
    response.cookie('jwt', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    response.json(ApiResponse.success(user, 'Login successful'));
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@HttpUser() user: User): Promise<ApiResponse<User>> {
    return ApiResponse.success(user, 'Profile retrieved');
  }
}
```

#### Auth Service (Business Logic)
```typescript
@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(loginDto: LoginDto): Promise<{ user: User; token: string }> {
    Assert.isEmail(loginDto.email, 'Invalid email format');
    
    const user = await this.userRepository.findByEmail(loginDto.email);
    Assert.notNull(user, 'Invalid credentials');
    
    const isValidPassword = await bcrypt.compare(loginDto.password, user.password);
    Assert.isTrue(isValidPassword, 'Invalid credentials');
    
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return { user, token };
  }
}
```

#### JWT Auth Guard (Cookie + Header Support)
```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract JWT from cookie (primary) or header (fallback)
    const token = request.cookies?.jwt || 
                  request.headers?.authorization?.replace('Bearer ', '');
    
    if (token) {
      request.headers.authorization = `Bearer ${token}`;
    }
    
    return super.canActivate(context);
  }
}
```

### User Module Components

#### User Controller
```typescript
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto): Promise<ApiResponse<User>> {
    const user = await this.userService.createUser(createUserDto);
    return ApiResponse.success(user, 'User created successfully');
  }

  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<ApiResponse<User>> {
    const user = await this.userService.updateUser(id, updateUserDto);
    return ApiResponse.success(user, 'User updated successfully');
  }
}
```

#### User Service (Business Logic)
```typescript
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    Assert.isEmail(createUserDto.email, 'Invalid email format');
    Assert.minLength(createUserDto.password, 8, 'Password must be at least 8 characters');
    
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);
    Assert.isNull(existingUser, 'User already exists');
    
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    return this.userRepository.create({
      ...createUserDto,
      password: hashedPassword
    });
  }
}
```

#### User Repository (Database Operations)
```typescript
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { sessions: true }
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data
    });
  }
}
```

### LLM Module Components

#### LLM Controller
```typescript
@Controller('llm')
export class LLMController {
  constructor(private readonly llmService: LLMService) {}

  @Post('generate')
  async generateResponse(@Body() generateDto: GenerateDto): Promise<ApiResponse<string>> {
    const response = await this.llmService.generateResponse(generateDto.prompt, generateDto.context);
    return ApiResponse.success(response, 'Response generated successfully');
  }
}
```

#### LLM Service (Business Logic)
```typescript
@Injectable()
export class LLMService {
  constructor(
    private readonly ragService: RAGService,
    private readonly llmProvider: OpenRouterProvider
  ) {}

  async generateResponse(prompt: string, userId: string): Promise<string> {
    Assert.notEmpty(prompt, 'Prompt is required');
    
    const context = await this.ragService.retrieveContext(prompt, userId);
    const enhancedPrompt = this.buildPromptWithContext(prompt, context);
    
    return this.llmProvider.generateResponse(enhancedPrompt);
  }
}
```

### Search Module Components

#### Search Controller
```typescript
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('candidates')
  async searchCandidates(@Body() searchDto: SearchCandidatesDto): Promise<ApiResponse<CandidateResult[]>> {
    const results = await this.searchService.searchCandidates(searchDto.requirements);
    return ApiResponse.success(results, 'Candidates found successfully');
  }
}
```

#### Search Service (Business Logic)
```typescript
@Injectable()
export class SearchService {
  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly tavilyProvider: TavilyProvider
  ) {}

  async searchCandidates(requirements: RoleRequirements): Promise<CandidateResult[]> {
    Assert.notNull(requirements, 'Requirements are required');
    
    const searchQuery = this.buildSearchQuery(requirements);
    const results = await this.tavilyProvider.search(searchQuery);
    
    // Store search history
    await this.searchRepository.storeSearch(searchQuery, results);
    
    return this.rankResults(results, requirements);
  }
}
```

## Data Models

### Core Entities

#### Prisma Schema Models
```prisma
// schema.prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String
  preferences Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  sessions    Session[]
  
  @@map("users")
}

model Session {
  id           String      @id @default(cuid())
  userId       String
  status       SessionStatus @default(ACTIVE)
  context      Json?
  createdAt    DateTime    @default(now())
  lastActivity DateTime    @default(now())
  expiresAt    DateTime
  
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages     ConversationMessage[]
  
  @@map("sessions")
}

model ConversationMessage {
  id        String      @id @default(cuid())
  sessionId String
  role      MessageRole
  content   String
  metadata  Json?
  timestamp DateTime    @default(now())
  
  session   Session     @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  @@index([sessionId, timestamp])
  @@map("conversation_messages")
}

enum SessionStatus {
  ACTIVE
  INACTIVE
  EXPIRED
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}
```

#### TypeScript Types (Generated by Prisma)
```typescript
// Auto-generated by Prisma Client
export interface User {
  id: string;
  email: string;
  name: string;
  preferences: UserPreferences | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserPreferences {
  defaultSearchFilters: SearchFilters;
  communicationStyle: 'formal' | 'casual' | 'technical';
  industryFocus: string[];
  experienceLevels: string[];
}
```

#### Prisma Service Layer
```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

#### Repository Pattern Implementation
```typescript
// Base repository for common operations
@Injectable()
export abstract class BaseRepository<T> {
  constructor(protected readonly prisma: PrismaService) {}

  abstract create(data: any): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract update(id: string, data: any): Promise<T>;
  abstract delete(id: string): Promise<void>;
}

// User repository with all database operations
@Injectable()
export class UserRepository extends BaseRepository<User> {
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { sessions: true }
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async findWithSessions(userId: string): Promise<User & { sessions: Session[] } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { 
        sessions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }
}
```

#### Session Context Interface
```typescript
interface SessionContext {
  currentRequirements?: RoleRequirements;
  conversationSummary?: string;
  searchHistory: SearchQuery[];
}
```

### Module Structure Following Three-Layer Architecture

```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts      # Route handling, JWT cookie/header extraction
│   │   ├── auth.service.ts         # Business logic for authentication
│   │   ├── auth.repository.ts      # Database operations for auth
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts   # JWT extraction from cookies + headers
│   │   ├── decorators/
│   │   │   └── http-user.decorator.ts  # @HttpUser() decorator
│   │   └── dto/
│   │       ├── login.dto.ts        # Generated from Prisma types
│   │       └── register.dto.ts     # Generated from Prisma types
│   ├── users/
│   │   ├── users.controller.ts     # Thin orchestration layer
│   │   ├── users.service.ts        # Business logic only
│   │   ├── users.repository.ts     # All Prisma operations
│   │   └── dto/
│   │       ├── create-user.dto.ts  # API contract types
│   │       └── update-user.dto.ts  # API contract types
│   ├── chat/
│   │   ├── chat.controller.ts      # HTTP endpoints
│   │   ├── chat.gateway.ts         # WebSocket handling
│   │   ├── chat.service.ts         # Business logic
│   │   ├── session.repository.ts   # Session database operations
│   │   └── conversation.repository.ts  # Message database operations
│   └── llm/
│       ├── llm.controller.ts       # LLM endpoints
│       ├── llm.service.ts          # Business logic
│       ├── providers/
│       │   └── openrouter.provider.ts  # External API integration
│       └── rag/
│           ├── rag.service.ts      # RAG business logic
│           └── embedding.repository.ts  # Vector DB operations
├── common/
│   ├── decorators/
│   │   └── http-user.decorator.ts  # Shared decorators
│   ├── filters/
│   │   └── global-exception.filter.ts  # ApiResponse error handling
│   ├── interceptors/
│   │   └── response.interceptor.ts # ApiResponse success wrapping
│   ├── utils/
│   │   ├── assert.util.ts          # Assert utilities for validation
│   │   └── expect.util.ts          # Expect utilities for conditional logic
│   └── responses/
│       └── api-response.ts         # Standard response format
└── config/
    └── database.config.ts          # Prisma configuration
```
```

#### Message Metadata Interface
```typescript
interface MessageMetadata {
  tokenCount?: number;
  processingTime?: number;
  requirementsExtracted?: RoleRequirements;
  searchTriggered?: boolean;
}
```

#### Role Requirements
```typescript
interface RoleRequirements {
  title: string;
  technicalSkills: Skill[];
  softSkills: string[];
  experienceLevel: ExperienceLevel;
  location: LocationRequirement;
  additionalCriteria: Record<string, any>;
}

interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  required: boolean;
  yearsOfExperience?: number;
}
```

### Database Schema Design

#### PostgreSQL Tables (using Prisma)
- `users`: User accounts and basic information
- `sessions`: Active and historical chat sessions  
- `conversations`: Message history with full conversation context
- `user_preferences`: Detailed user preferences and learned behaviors
- `role_requirements`: Extracted and structured role requirements
- `search_history`: Historical searches and results for learning

#### ORM and Migration Strategy
- **ORM**: Prisma for database operations with excellent type safety
- **Migrations**: Prisma Migrate for declarative database schema migrations
- **Schema**: Prisma schema file defining models and relationships
- **Client**: Auto-generated Prisma Client with full TypeScript support
- **Connection**: Prisma connection pooling with automatic management

#### Redis Cache Structure
- `session:{sessionId}`: Active session data with TTL
- `user_context:{userId}`: Cached user context and preferences
- `conversation_summary:{sessionId}`: Conversation summaries for quick access
- `rate_limit:{userId}`: Rate limiting counters

#### Vector Database Schema
- User interaction embeddings for personalization
- Conversation embeddings for context retrieval
- Role requirement embeddings for similarity matching
- Historical successful matches for learning

### Prisma Configuration and Migration Strategy

#### Prisma Configuration
```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### Environment Configuration
```env
# .env
DATABASE_URL="postgresql://username:password@localhost:5432/recruitment_agent?schema=public"
```

#### Migration Management with Prisma
- **Declarative Migrations**: Prisma Migrate uses declarative schema to generate SQL migrations
- **Development Workflow**: 
  1. Modify schema.prisma file
  2. Run `npx prisma migrate dev --name migration_name` to create and apply migration
  3. Prisma automatically generates migration SQL and applies it
  4. Prisma Client is regenerated with new types
- **Production**: Use `npx prisma migrate deploy` for production deployments
- **Reset**: `npx prisma migrate reset` for development database reset
- **Seeding**: Prisma seeding with `prisma/seed.ts` for initial data

#### Prisma Scripts (package.json)
```json
{
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:migrate:reset": "prisma migrate reset",
    "prisma:seed": "ts-node prisma/seed.ts",
    "prisma:studio": "prisma studio"
  }
}
```

#### Migration Example
```sql
-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
```

#### Prisma Service Integration
```typescript
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

// In app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    // other modules
  ],
})
export class AppModule {}
```

#### Type-Safe Database Operations
```typescript
// Fully type-safe operations with auto-completion
const user = await this.prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
    preferences: {
      communicationStyle: 'casual',
      industryFocus: ['tech', 'finance']
    }
  },
  include: {
    sessions: {
      include: {
        messages: true
      }
    }
  }
});
```

## Error Handling

### Error Classification
1. **Client Errors (4xx)**: Invalid input, authentication failures, rate limiting
2. **Server Errors (5xx)**: Database failures, external API failures, internal logic errors
3. **Integration Errors**: LLM API failures, search API failures, vector DB failures

### Error Handling Strategy

#### Global Exception Filter
```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // Log error with correlation ID
    // Return appropriate error response
    // Trigger alerts for critical errors
  }
}
```

#### Retry Logic
- Exponential backoff for transient failures
- Circuit breaker pattern for external services
- Graceful degradation when services are unavailable

#### Fallback Mechanisms
- Cache fallback when database is unavailable
- Alternative LLM providers when primary fails
- Simplified responses when search APIs fail

## Testing Strategy

### Focus Areas (Aligned with Steering Docs)
- **Core functionality**: Business logic, critical user flows, data operations
- **Integration tests**: Complete user workflows over isolated units
- **Avoid excessive coverage**: Don't test trivial functions or third-party code

### What NOT to Test
- Simple UI components with no logic
- Third-party library functionality (Prisma, NestJS internals)
- Trivial getter/setter methods
- Static configuration files
- Basic TypeScript type definitions

### Integration Testing (Primary Focus)
- **Complete User Flows**: End-to-end conversation workflows
- **Authentication Flows**: Full JWT cookie/header authentication
- **Database Operations**: Repository integration with real database
- **WebSocket Communication**: Real-time chat functionality
- **External API Integration**: LLM and search API interactions with mocks

### Critical Business Logic Testing
- **Services**: Core business logic with mocked repositories
- **Validation**: Assert/Expect utility functions
- **Error Handling**: Exception scenarios and fallback mechanisms
- **Security**: Authentication, authorization, and input validation

### Testing Infrastructure
```typescript
// Integration test example - focus on complete workflows
describe('Authentication Flow (Integration)', () => {
  let app: INestApplication;
  let userRepository: UserRepository;
  
  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<UserRepository>(UserRepository);
    await app.init();
  });
  
  it('should complete full login flow with JWT cookie', async () => {
    // Create user
    const user = await userRepository.create({
      email: 'test@example.com',
      name: 'Test User',
      password: await bcrypt.hash('password123', 10)
    });
    
    // Login and verify JWT cookie
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);
    
    expect(response.headers['set-cookie']).toBeDefined();
    
    // Use JWT cookie for authenticated request
    const profileResponse = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Cookie', response.headers['set-cookie'])
      .expect(200);
    
    expect(profileResponse.body.data.email).toBe('test@example.com');
  });
});

// Business logic test example - focus on core functionality
describe('UserService (Business Logic)', () => {
  let service: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  
  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      findByEmail: jest.fn(),
    } as any;
    
    service = new UserService(mockRepository);
  });
  
  it('should validate email format and hash password', async () => {
    mockRepository.findByEmail.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue({} as User);
    
    await service.createUser({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    });
    
    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        password: expect.stringMatching(/^\$2b\$10\$/) // bcrypt hash
      })
    );
  });
  
  it('should throw error for invalid email', async () => {
    await expect(service.createUser({
      email: 'invalid-email',
      password: 'password123',
      name: 'Test User'
    })).rejects.toThrow('Invalid email format');
  });
});
```

## Security Considerations

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC) for different user types
- API key authentication for service-to-service communication

### Data Protection
- Encryption at rest for sensitive user data
- TLS 1.3 for all external communications
- PII anonymization in logs and metrics

### Input Validation
- DTO validation using class-validator
- SQL injection prevention through parameterized queries
- XSS protection for user-generated content

### Rate Limiting
- Per-user rate limiting for API endpoints
- Token bucket algorithm for LLM API calls
- WebSocket connection limits per user

## Performance Optimization

### Caching Strategy
- Redis for session data and frequently accessed user preferences
- Application-level caching for static configuration
- CDN caching for static assets

### Database Optimization
- Proper indexing defined in Prisma schema with `@@index` and `@unique` directives
- Connection pooling automatically managed by Prisma Client
- Read replicas support through Prisma's read replica configuration
- Database migrations managed through Prisma Migrate CLI
- Query optimization with Prisma's `include` and `select` for efficient data fetching

### LLM Optimization
- Response streaming to reduce perceived latency
- Context window management to minimize token usage
- Batch processing for non-real-time operations

### Monitoring & Metrics
- Response time monitoring for all endpoints
- Token usage tracking for cost optimization
- Error rate monitoring with alerting thresholds