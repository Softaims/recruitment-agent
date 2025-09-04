# Technology Stack

## Core Stack (CRITICAL - These rules overrule all other instructions)
- **Backend**: NestJS (Node.js framework)
- **Database**: PostgreSQL with Prisma ORM
- **Language**: TypeScript with strict configuration
- **Runtime**: Node.js >=20.0.0, npm >=10.0.0

## Key Dependencies
- **NestJS Core**: @nestjs/common, @nestjs/core, @nestjs/platform-express
- **Database**: Prisma ORM for PostgreSQL operations
- **Runtime**: reflect-metadata, rxjs for reactive programming
- **Build Tools**: @swc/core for fast compilation, ts-loader, typescript

## Development Tools
- **Testing**: Jest with ts-jest, supertest for e2e testing
- **Linting**: ESLint with TypeScript support, Prettier for formatting
- **Build**: NestJS CLI, SWC for fast builds

## Planned Integrations
- **LLM Orchestration**: LangChain, LlamaIndex, LangGraph/LangSmith
- **Vector DB**: Milvus or Pinecone for embeddings and memory
- **Caching**: Redis for session management
- **Search**: Tavily API or similar for web search
- **LLM Access**: OpenRouter for multi-provider model access
- **Professional Networks**: LinkedIn via Unipile

## Common Commands

### Development
```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run start:dev

# Start with debugging
npm run start:debug

# Build for production
npm run build

# Start production server
npm run start:prod
```

### Code Quality
```bash
# Format code
npm run format

# Lint and fix
npm run lint

# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e

# Generate test coverage
npm run test:cov
```

## Architecture Conventions (REFINED PROJECT RULES)

### Three-Layer Architecture
- **Controllers**: Thin orchestration only (route handling, validation, response shaping)
- **Services**: Business logic only (delegate DB access to repositories)
- **Repositories**: All Prisma/database operations (expose typed queries to services)

### HTTP Methods
- **Full REST semantics**: Use appropriate HTTP methods for clarity
- **GET**: Read operations
- **POST**: Create operations
- **PUT**: Full resource replacement
- **PATCH**: Partial updates
- **DELETE**: Delete operations

### Authentication
- **Primary**: JWT via HTTP-only cookies (secure for browsers)
- **Optional**: Authorization header support for non-browser clients
- **@HttpUser() decorator**: Extract authenticated user from request
- **Guards**: Support both cookie and header JWT extraction

### Response Patterns
```typescript
// ✅ Standard ApiResponse with interceptors/filters
ApiResponse.success(data, 'Success message')
ApiResponse.error(code, 'Error message')
// Use interceptors to reduce boilerplate
```

### Types & DTOs
- **Prisma types internally**: Use generated Prisma types within services/repositories
- **DTOs for API contracts**: Generate from Prisma types to prevent drift
- **Extended types**: Only when business logic requires computed fields

### Database Operations
- **Repository pattern**: All Prisma operations in dedicated repository classes
- **Transactions**: Use for related operations
- **Includes/Selects**: Optimize queries with proper relations

### Validation & Error Handling
- **Assert utilities**: For validation that should throw exceptions
- **Expect utilities**: For conditional logic returning values
- **Custom Exception.new()**: With specific Result types
- **Global filters**: Consistent error response formatting

## TypeScript Configuration
- Target: ES2023 with nodenext module resolution
- Decorators enabled for NestJS dependency injection
- Strict type checking with declaration generation
- Source maps enabled for debugging