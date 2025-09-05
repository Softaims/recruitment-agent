# Copilot project instructions

Use this as your fast-start guide to contribute productively to this NestJS backend. Keep changes aligned with the existing three-layer architecture and conventions.

## Big picture
- Architecture: NestJS with strict layers — Controllers (HTTP), Services (business logic), Repositories (Prisma DB). See `src/modules/**` and `src/database/**`.
- Data: PostgreSQL via Prisma. Core models: `User`, `Session`, `ConversationMessage` with enums `SessionStatus`, `MessageRole` (see `prisma/schema.prisma`).
- State: Sessions cached via Redis (`src/database/redis.service.ts`), validated/maintained in `SessionsService`.
- Real-time: WebSocket gateway at namespace `/chat` using Socket.IO (`src/modules/chat/chat.gateway.ts`).
- Auth: JWT (HTTP-only cookie primary, Authorization header fallback). Guard is applied per-route/module; WebSocket verifies token during handshake.

## Steering docs (precedence)
- CRITICAL rules: `.kiro/steering/coding-standards.md` — these override all other instructions.
- Architecture/structure/product/tech context: `.kiro/steering/{structure.md,product.md,tech.md}`.
- P0 design details: `.kiro/specs/p0-backend/design.md`.
- Use this file as a quick implementation guide; defer to the steering docs for decisions.

## Run/build/test (npm >=10, Node >=20)
```bash
npm install
cp .env.example .env
npm run prisma:generate && npm run prisma:migrate
npm run start:dev  # or npm run test / npm run test:e2e
```
DB helpers: `npm run db:setup`, `npm run db:reset`, `npm run db:validate` (see `scripts/`).

## Conventions that matter
- Responses: Global `ResponseInterceptor` wraps non-ApiResponse values. Prefer returning `ApiResponse.success(data)` in controllers; for errors either return `ApiResponse.error(code, msg)` or throw `CustomException`/`HttpException` to let `GlobalExceptionFilter` format as `ApiResponse.error(...)`. Files: `src/common/responses/api-response.ts`, `src/common/filters/global-exception.filter.ts`.
- Validation: Global `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }` (see `src/main.ts`). Use DTOs with `class-validator` in `modules/**/dto`.
- Auth in HTTP: Apply `JwtAuthGuard` on controllers; access user via `@HttpUser()` (re-export at `src/common/decorators/http-user.decorator.ts`). Example: `AuthController`, `SessionsController`.
- Services vs repositories: Services must not query Prisma directly. Repositories live under `src/database/repositories/**` or module-local (e.g., `chat/conversation.repository.ts`) and depend on `PrismaService`.
- Assertions & flow: Use `Assert` utilities for business rules (`src/common/utils/assert.util.ts`). Optional branching uses `Expect` (`src/common/utils/expect.util.ts`).
- Config: Access via `ConfigService` using keys from `src/config/configuration.ts` (e.g., `config.get('app.session.defaultExpirationHours')`). If you add env vars, update `src/config/validation.schema.ts` and `configuration.ts`.

## CRITICAL conventions (inline)
- Three-layer rules: Controllers = thin orchestration; Services = business logic only; Repositories = all Prisma DB ops. Never call Prisma from Services/Controllers.
- HTTP semantics: GET read, POST create, PUT replace, PATCH partial update, DELETE remove. Keep routes resource-oriented.
- Auth: Primary JWT via HTTP-only cookie `jwt`; header `Authorization: Bearer` as fallback. Use `JwtAuthGuard` and `@HttpUser()`; WebSocket extracts token in handshake (see `extractTokenFromClient`).
- Responses: Always return `ApiResponse.success(...)`; throw exceptions to let `GlobalExceptionFilter` return `ApiResponse.error(...)`. Interceptor auto-wraps raw values.
- DTOs/types: Use Prisma types internally; define DTOs with class-validator for API contracts; avoid leaking passwords/secure fields.
- Repos/transactions: Keep complex multi-write flows in repositories using Prisma transactions; expose typed helpers like `findActiveByUserId`.
- Validation & errors: Use `Assert.notNull(...)`, `Assert.isTrue(...)`; prefer deterministic error codes; avoid silent failures.
- Testing: Favor integration-style tests for modules/routes; avoid trivial unit tests and 3rd-party behavior tests.

## WebSocket chat patterns (src/modules/chat)
- Gateway: `chat.gateway.ts` handles connection auth (cookie `jwt` or `Authorization`), room join/leave (`session:${id}`), and events:
  - `join_session`, `leave_session`, `send_message`, `typing`, `get_session_info`.
- Message flow: Gateway -> `ChatService.processMessage` -> `ConversationRepository` -> broadcast `message_received` to the session room.
- Always validate session membership and update activity through `SessionsService`.

### Do/Don’t cribsheet
- Do: Guard chat HTTP routes and WS with JWT; validate session ownership in gateway and service.
- Do: Update session last activity on message/join/leave via `SessionsService.updateSessionActivity`.
- Do: Use repositories for all DB reads/writes; add missing helpers in repo instead of inlining queries.
- Don’t: Bypass `ApiResponse`/global filter/interceptor or return raw Prisma errors.
- Don’t: Hardcode env; read via `ConfigService` and update `configuration.ts` + `validation.schema.ts` when adding keys.

## Sessions and caching
- `SessionsService` enforces limits, expiration, and activity updates; caches session metadata in Redis. Cache keys: `session:${id}`. Cache is opportunistic; DB is the source of truth.
- Repositories expose helpers like `findActiveByUserId`, `findWithMessages`, `updateLastActivity`, `deleteExpiredSessions`.

## Testing
- Jest unit tests co-located under `src/**.spec.ts`. E2E tests under `test/` with config `test/jest-e2e.json`. Prefer integration-style tests for routes/services with realistic flows (see existing `auth`, `chat`, `sessions` specs).

### Testing strategy (from steering)
- Focus on core functionality and end-to-end user flows; avoid trivial unit tests and third-party behavior tests.
- Write integration tests for modules/routes; co-locate unit tests near code, e2e tests under `test/`.
- Don’t test: simple getters/setters, third-party libs, static config, basic type definitions.

## Examples from the codebase
- Controller success response: `return ApiResponse.success(session, 'Session created successfully');` (`SessionsController`).
- Guarded profile route: `@UseGuards(JwtAuthGuard) @Get('profile')` with `@HttpUser()` (`AuthController`).
- Socket auth extraction: see `extractTokenFromClient` in `chat.gateway.ts`.
- Repository-first DB access: `conversation.repository.ts`, `session.repository.ts`, `user.repository.ts`.

## Integration points
- LLM/search/vector config keys exist (`OPENROUTER_API_KEY`, `TAVILY_API_KEY`, `app.vectorDb.*`) but providers are not wired yet. When adding, encapsulate in a Nest module/provider and consume via services; configure via `ConfigService`.

## When adding features
- Follow `.kiro/steering/coding-standards.md` first. Keep controllers thin, reuse `ApiResponse`, validate via DTOs, and push all DB calls into a repository. Use `SessionsService` for any session-side effects. Update env validation when introducing new config.

### Comments & documentation (from steering)
- Keep comments minimal; code should be self-explanatory. Comment only complex/non-obvious logic and known workarounds.
- Prefer clear naming over explanatory comments. Avoid obvious comments (e.g., “Gets the user ID”).
