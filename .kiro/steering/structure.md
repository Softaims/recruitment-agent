# Project Structure

## Root Directory Organization
```
├── src/                    # Main application source code
├── test/                   # End-to-end tests
├── docs/                   # Project documentation
├── .kiro/                  # Kiro AI assistant configuration
├── .vscode/                # VS Code workspace settings
└── dist/                   # Compiled output (generated)
```

## Source Code Structure (`src/`)
- **app.module.ts**: Root application module with dependency injection setup
- **app.controller.ts**: Main application controller with route handlers
- **app.service.ts**: Core business logic and service layer
- **main.ts**: Application bootstrap and server startup

## NestJS Conventions (REFINED ARCHITECTURE)
- **Modules**: Feature-based organization using `@Module()` decorators
- **Controllers**: Thin orchestration (route handling, validation, response shaping)
- **Services**: Business logic only (delegate DB operations to repositories)
- **Repositories**: All Prisma/database operations
- **Guards**: JWT authentication (cookie + optional header support)
- **Interceptors**: Response transformation and boilerplate reduction
- **Pipes**: Input validation and transformation
- **Filters**: Global exception handling with ApiResponse patterns

## File Naming Patterns
- **Controllers**: `*.controller.ts`
- **Services**: `*.service.ts` (business logic only)
- **Repositories**: `*.repository.ts` (Prisma operations)
- **Modules**: `*.module.ts`
- **Tests**: `*.spec.ts` (unit), `*.e2e-spec.ts` (integration)
- **DTOs**: `*.dto.ts` (create, update, response DTOs)
- **Entities**: `*.entity.ts` (Prisma-generated types preferred)

## Future Modular Architecture
As the recruitment agent develops, expect this three-layer structure:
```
src/
├── core/                   # Topic-agnostic core services
├── modules/
│   ├── auth/              # JWT authentication (HTTP-only cookies + header fallback)
│   ├── users/             # User management with Prisma repositories
│   ├── chat/              # WebSocket gateway and conversation management
│   ├── search/            # External search API integration (Tavily)
│   ├── llm/               # LLM orchestration with OpenRouter
│   ├── rag/               # Vector DB and RAG implementation
│   └── recruitment/       # Domain-specific recruitment logic
├── common/                # Shared decorators, filters, interceptors, guards
├── shared/                # Shared utilities and types
├── config/                # Configuration management
└── prisma/                # Database schema and migrations
    ├── schema.prisma      # Prisma schema definition
    ├── migrations/        # Database migration files
    └── seed.ts           # Database seeding script

# Each module follows three-layer pattern:
modules/users/
├── users.controller.ts    # Route handling, validation, response shaping
├── users.service.ts       # Business logic only
├── users.repository.ts    # All Prisma/database operations
├── users.module.ts        # Module definition
├── dto/                   # API contract types (generated from Prisma)
└── types/                 # Extended business logic types
```

## Documentation Structure (`docs/`)
- **Architecture_and_Requirements.md**: Comprehensive system design
- **Recruitment_Agent_Project_Overview.md**: Executive summary
- **Features.md**: Detailed feature roadmap (P0-P2)
- **Extensible_Architecture_Agent.md**: Plugin architecture details

## Database Structure
- **PostgreSQL**: Primary database with Prisma ORM
- **Redis**: Session caching and frequently accessed data
- **Vector DB**: Milvus or Pinecone for embeddings and RAG
- **Prisma Schema**: Declarative schema with User, Session, ConversationMessage models
- **Migrations**: Managed via Prisma Migrate with `npx prisma migrate dev`

## Configuration Files
- **nest-cli.json**: NestJS CLI configuration
- **tsconfig.json**: TypeScript compiler options with strict mode
- **package.json**: Dependencies and npm scripts
- **eslint.config.mjs**: ESLint rules and formatting
- **.prettierrc**: Code formatting preferences
- **prisma/schema.prisma**: Database schema definition
- **.env**: Environment variables (DATABASE_URL, JWT_SECRET, etc.)