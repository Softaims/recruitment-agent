---
mode: ask
---

# Backend P0 multi-pass plan prompt

Use this prompt to drive an iterative, engineering-grade implementation of the P0 backend. Follow the three-layer architecture and project conventions strictly. Work in short passes with measurable outcomes, add tests alongside code, and keep referring back to the design and requirements.

## How to use this
- Before any coding, read the referenced docs and extract a concrete checklist of requirements and acceptance criteria.
- Execute the plan in multiple passes. After each pass: run checks, tests, and refine.
- Keep changes minimal and localized; favor repositories for DB access, DTOs for validation, and ApiResponse for outputs.

## References you MUST use
- Backend specs: `.kiro/specs/p0-backend/requirements.md`, `.kiro/specs/p0-backend/design.md`, `.kiro/specs/p0-backend/tasks.md`
- General docs: `docs/` (architecture, features, product scope)
- Steering and coding standards: `.kiro/steering/*` (coding-standards.md takes precedence)
- Key project files: `prisma/schema.prisma`, `src/common/responses/api-response.ts`, `src/common/filters/global-exception.filter.ts`, `src/main.ts`, `src/config/{configuration.ts,validation.schema.ts}`, `src/database/**`, `src/modules/**`, `src/modules/chat/chat.gateway.ts`

## Ground rules (do not violate)
- Three-layer separation: Controllers (thin), Services (business logic), Repositories (all Prisma). No direct Prisma calls outside repos.
- HTTP semantics and DTO validation (`class-validator`).
- Auth: JWT via HTTP-only cookie `jwt` primary; header `Authorization: Bearer` fallback. Use `JwtAuthGuard` and `@HttpUser()`.
- Responses: Return `ApiResponse.success(...)`; throw exceptions to let `GlobalExceptionFilter` return `ApiResponse.error(...)`.
- Config via `ConfigService`; update `configuration.ts` and `validation.schema.ts` when adding env keys.
- Sessions: Use `SessionsService` for rules and Redis caching; DB is source of truth.
- Testing: Prefer integration and e2e for flows over trivial unit tests.

## Definition of Done (P0)
P0 is complete when all minimum backend features in phase 1 are robustly implemented, edge cases handled, and meaningful error responses are returned. Concretely, map to Requirements 1–10 in `requirements.md` with:
- Auth working (cookie+header), guarded routes and WS handshake.
- Session lifecycle (create, restore, 30-min inactivity persistence, activity updates, expiration cleanup).
- Chat via WebSocket: join/leave session rooms, send/receive messages, typing, streaming AI responses.
- Conversation persistence and retrieval, plus summarization when token limits are exceeded.
- LLM abstraction with OpenRouter integration, streaming, backoff/fallback.
- Basic external search integration (e.g., Tavily) with ranking, graceful degradation, and caching.
- Profile/memory foundation storing preferences and applying them in new sessions.
- Config validation, health checks, structured logging/metrics, and resilience (retries, circuit breakers).

## Pass template (fill this each pass)
1) Scope for this pass
- Objective: …
- Related requirements: … (reference by number, e.g., 2.1, 6.3)
- Files likely touched: …

2) Quick analysis
- Current state (from code): …
- Assumptions (≤2, explicit): …
- Edge cases to cover: empty/null, unauthorized, timeouts, rate limit, large payloads, expired sessions, concurrent writes.

3) Mini contract (inputs/outputs)
- Inputs (DTOs, params): …
- Outputs (ApiResponse shape, events): …
- Errors: deterministic codes/messages via exception filter.

4) Implementation checklist
- [ ] Repo changes …
- [ ] Service logic …
- [ ] Controller/WS gateway wiring …
- [ ] DTOs/validation …
- [ ] Config/feature flag …
- [ ] Tests (happy + 1–2 edges) …

5) Quality gates (run after coding)
- Build and type-check: PASS/FAIL
- Lint: PASS/FAIL
- Unit/integration/e2e relevant tests: PASS/FAIL
- Smoke test (tiny run or mock): PASS/FAIL

6) Evidence and notes
- Changes summary …
- Follow-ups/debt …

7) Refinement and debugging
- Fix failing checks/tests; add missing edge cases.
- Improve logs (redact secrets), add metrics as needed.
- Tighten DTOs/validation and error messages via `GlobalExceptionFilter`.
- Update docs/spec mapping; re-run quality gates.

## Multi-pass plan (recommended sequence)

Pass 0 — Baseline and guardrails
- Verify build, migrations, seeds, and test harness run locally.
- Ensure `GlobalExceptionFilter`, `ResponseInterceptor`, and global `ValidationPipe` are wired correctly.
- Add missing env validation and defaults in `validation.schema.ts` and `configuration.ts`.

Pass 1 — Sessions foundation (Req 2.1, 2.4, 2.5, 7.2)
- Finish `SessionRepository` helpers (findActiveByUserId, updateLastActivity, deleteExpiredSessions, findWithMessages).
- Implement `SessionsService` rules (expiration window, activity update on message/join/leave) with Redis caching.
- Add `SessionsController` routes (create, list active, get by id, close) with DTOs and `JwtAuthGuard`.
- Tests: session create/restore/expire; cache miss fallback to DB.

Pass 2 — WebSocket chat (Req 1.2, 2.2, 2.3)
- Complete `ChatGateway`: handshake auth (cookie/header), room join `session:{id}`, leave, `send_message`, `typing`, `get_session_info`.
- Ensure membership validation and activity updates via `SessionsService`.
- Broadcast `message_received` events; wire errors via consistent codes.
- Tests: connect, join, send, streaming stub, disconnect cleanup.

Pass 3 — Conversation management (Req 2.2, 2.6, 5.5)
- `ConversationRepository`: append message, list messages (paginated), latest summary.
- `ChatService.processMessage`: persist user msg, call LLM (stub), persist assistant chunks, emit stream; summarize when token window approached.
- Edge: large history, truncated streams, invalid roles.

Pass 4 — LLM abstraction and streaming (Req 6.1, 6.3, 6.4, 6.5)
- `LLMService` abstraction; provider adapter for OpenRouter; streaming interface.
- Token counting + context window mgmt inputs; retries with backoff; fallback model.
- Config keys + validation; redact secrets in logs.
- Tests with mocked provider streams.

Pass 5 — RAG scaffolding (Req 6.2, 7.3)
- Provider-agnostic vector interface; optionally stub Milvus/Pinecone behind feature flag.
- `RAGService`: build context from recent msgs + retrieval; store embeddings asynchronously.
- Wire into `ChatService` context builder.

Pass 6 — Requirement extraction (Req 3.x)
- `RequirementService` to structure skills/experience/soft skills; conflict detection and clarifications surface.
- Repository + persistence; apply to session context.

Pass 7 — External search (Req 4.x)
- Tavily adapter; query by structured requirements; rank/filter; cache + degrade gracefully.
- Expose `SearchController` endpoints; integrate optional triggers from conversation.

Pass 8 — Memory and personalization (Req 5.x)
- Memory repository/service storing preferences and quirks; `user_context:{userId}` cache.
- Apply preferences on new sessions.

Pass 9 — Observability, security, resilience (Req 1.3–1.5, 8.x, 10.x)
- Health endpoints (DB, Redis, external providers).
- Structured logging with correlation IDs; basic metrics.
- Rate limiting (HTTP + WS), CORS and security headers.
- Circuit breakers around LLM/search.

Pass 10 — E2E and performance
- E2E tests: login → create session → chat → streamed AI → summarization → search.
- Performance smoke: large history, multiple concurrent sessions.

## Always-on checks per pass
- Requirements coverage: Map changed code to requirement numbers; note Done/Deferred.
- API contracts: DTOs validate inputs; no sensitive fields in responses.
- Architecture: No direct Prisma in services/controllers.
- Config: New keys added to `configuration.ts` + `validation.schema.ts`; `.env.example` updated if applicable.
- Tests: Add or update relevant tests near changed code; prefer integration-style.

## Optional commands (for local use)
```bash
# Install and prepare DB
npm install
cp .env.example .env
npm run prisma:generate && npm run prisma:migrate

# Run
npm run start:dev

# Tests
npm run test
npm run test:e2e
```

## Exit report (fill when finishing P0)
- Requirements coverage: …
- Quality gates summary: Build/Lint/Tests/Smoke PASS? …
- Known gaps (if any) and mitigation plan: …
