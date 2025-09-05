---
mode: agent
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

[Pass 0 — evidence and notes]
- WebSocket unauthorized handling stabilized: `ChatGateway.handleConnection` now performs an explicit server-side disconnect for bad/missing tokens (no extra error emit), aligning client reason with Socket.IO (“server disconnect” / “io server disconnect”). File: `src/modules/chat/chat.gateway.ts`.
- WS specs updated to accept both disconnect reason variants, disable reconnection for unauthenticated cases, and guard `done()` to avoid multiple invocations. File: `src/modules/chat/chat.gateway.spec.ts`.
- HTTP integration bootstrap now mirrors main: cookie parsing + global `ValidationPipe` enabled so DTO validations apply. File: `src/modules/chat/chat.integration.spec.ts`.
- Integration tests use unique emails to avoid unique constraint collisions and generate JWT with app’s JwtService. Same file as above.
- Results: chat gateway and integration suites green locally; continue applying the same bootstrap to other suites as needed.

Update — 2025-09-05 (baseline verification and fixes)
- Environment and build: `.env` prepared from example; dependencies installed; Prisma client generated; project builds successfully.
- Tests: Full test suite is green (9 suites, 83 tests).
- Response envelope fix: `ApiResponse.error(...)` now includes `error.message` in the error object to match tests and the global exception filter expectations. File: `src/common/responses/api-response.ts`.
- Auth test stabilization: `auth.controller.spec.ts` complete flow uses the generated `uniqueEmail` for login/cleanup (removed hardcoded email) to avoid flakiness and uniqueness violations.
- Lint: 0 errors (553 warnings remain). Addressed two `no-empty` cases by replacing empty catch blocks in `src/modules/chat/chat.gateway.spec.ts` with safe no-ops.
- Quality gates summary: Build PASS, Tests PASS, Lint PASS (errors=0).

Pass 1 — Sessions foundation (Req 2.1, 2.4, 2.5, 7.2)
- Finish `SessionRepository` helpers (findActiveByUserId, updateLastActivity, deleteExpiredSessions, findWithMessages).
- Implement `SessionsService` rules (expiration window, activity update on message/join/leave) with Redis caching.
- Add `SessionsController` routes (create, list active, get by id, close) with DTOs and `JwtAuthGuard`.
- Tests: session create/restore/expire; cache miss fallback to DB.

[Pass 1 — evidence and notes]
- Scope: Implemented sessions lifecycle foundation with sliding inactivity expiration and Redis-backed caching for session lookups. HTTP routes guarded and returning ApiResponse envelopes.
- Repository: `SessionRepository` now includes helpers `findActiveByUserId`, `findWithMessages`, `updateLastActivity`, `findExpiredSessions`, `markExpired`, and `deleteExpiredSessions` (file: `src/database/repositories/session.repository.ts`).
- Service: `SessionsService` adjusted to honor sliding inactivity timeout (`app.session.timeoutMinutes`), refreshing `expiresAt` on access/activity and marking status EXPIRED with timestamp on expiration. Cache keys `session:{id}` are populated and cleared appropriately (file: `src/modules/sessions/sessions.service.ts`). Type `SessionConfig` extended with `timeoutMinutes` (file: `src/modules/sessions/types/session.types.ts`).
- Controller: `SessionsController` provides routes to create/list/get/update/context/activity/expire/delete, guarded by `JwtAuthGuard` and using `@HttpUser()` (file: `src/modules/sessions/sessions.controller.ts`).
- Tests: Added integration suite `sessions.integration.spec.ts` covering create → list → get → update context → activity bump → expire. Updated `sessions.service.spec.ts` to reflect sliding expiration behavior (files under `src/modules/sessions/`).
- Config: No new env keys; using existing `SESSION_TIMEOUT_MINUTES` exposed as `app.session.timeoutMinutes`.
- Results: All tests green locally after updates.

Quality gates (after Pass 1)
- Build and type-check: PASS
- Lint: PASS (same baseline warnings count)
- Unit/integration/e2e relevant tests: PASS (91 tests total)
- Smoke: PASS (minimal flows exercised in integration)

Requirements coverage
- 2.1 Session lifecycle create/restore with expiration window — Done
- 2.4 Activity updates on join/leave/message via service — Done (used by ChatGateway/ChatService)
- 2.5 Expiration cleanup via scheduler/service helpers — Done
- 7.2 Redis caching for sessions — Done (cache on get/update, delete on expire/delete)

Follow-ups
- Consider caching user sub-objects alongside session cache to enable cache hits on `getSession` without DB roundtrip.
- Add pagination DTOs/validation for sessions listing and consistent error codes for all endpoints.

Pass 2 — WebSocket chat (Req 1.2, 2.2, 2.3)
- Complete `ChatGateway`: handshake auth (cookie/header), room join `session:{id}`, leave, `send_message`, `typing`, `get_session_info`.
- Ensure membership validation and activity updates via `SessionsService`.
- Broadcast `message_received` events; wire errors via consistent codes.
- Tests: connect, join, send, streaming stub, disconnect cleanup.

[Pass 2 — evidence and notes]
- Scope: WebSocket chat lifecycle is implemented end-to-end in `ChatGateway` with auth, room join/leave, message send/broadcast, typing, and session info retrieval. Behavior verified with integration and e2e tests.
- Gateway: `chat.gateway.ts`
	- Auth handshake extracts JWT from Authorization header (Bearer) or `jwt` cookie via `extractTokenFromClient`; verifies via `JwtService`. On failure, server-side disconnect is performed.
	- `join_session` validates session exists and belongs to the user (`SessionsService.getSession`), leaves prior room, joins `session:{id}`, bumps activity, emits `session_joined` to the client and `user_joined` to the room.
	- `leave_session` leaves room, bumps activity, emits `session_left` to the client and `user_left` to the room.
	- `send_message` validates active session membership, persists via `ChatService.processMessage`, and broadcasts `message_received` to the room.
	- `typing` emits `typing_indicator` to other clients in the same room.
	- `get_session_info` returns `{ connected, sessionId, session: { id,status,createdAt,lastActivity }, messageCount }` when in a session, or `{ connected: false }` otherwise.
- Service/repository usage: All DB writes/reads are in `ConversationRepository`; `ChatService` validates session with `SessionsService`, persists messages, and updates session activity. No direct Prisma calls in gateway/service outside the repository.
- Tests added/existing and passing:
	- `src/modules/chat/chat.gateway.spec.ts`: handshake auth success/fail, join/leave, send_message broadcast, typing, get_session_info, multi-client broadcast.
	- `src/modules/chat/chat.e2e-spec.ts`: full WS workflow against `AppModule` and DB, plus HTTP↔WS integration checks.
	- `src/modules/chat/chat.integration.spec.ts` and `chat.controller.spec.ts`: HTTP paths and data shapes.
- Results: All suites green locally.

Quality gates (after Pass 2)
- Build and type-check: PASS
- Lint: PASS (warnings remain; no errors). No changes introduced new warnings.
- Unit/integration/e2e tests: PASS (10 suites, 91 tests)
- Smoke: PASS (multi-client WS message broadcast, session info)

Requirements coverage
- 1.2 WebSocket auth and events (connect, join, leave, send, typing) — Done
- 2.2 Session membership validation on WS actions — Done
- 2.3 Real-time message broadcasting to session room — Done
- Streaming AI responses — Deferred to Pass 4 (LLM abstraction/streaming)

Follow-ups
- Introduce structured WS error codes in `error.data` alongside `message` for clients (requires test updates).
- Add rate limiting for WS events and per-room backpressure metrics.
- Implement assistant streaming in Pass 4; wire gateway to stream chunks.

Pass 3 — Conversation management (Req 2.2, 2.6, 5.5)
- `ConversationRepository`: append message, list messages (paginated), latest summary.
- `ChatService.processMessage`: persist user msg, call LLM (stub), persist assistant chunks, emit stream; summarize when token window approached.
- Edge: large history, truncated streams, invalid roles.

[Pass 3 — evidence and notes]
- Scope: Implemented conversation persistence + pagination, latest summary retrieval, and asynchronous assistant stub with basic summarization into session context when message count crosses a threshold.
- Repository: Added `getLatestSummary(sessionId)` returning `{ summary }` from `Session.context.conversationSummary`; kept existing pagination helpers. File: `src/modules/chat/conversation.repository.ts`.
- Service (conversation): Exposed `getLatestSummary` via `ConversationService`. File: `src/modules/chat/conversation.service.ts`.
- Service (chat): `processMessage` now validates session, persists the user message, bumps activity, and fire-and-forget calls a new helper `generateAssistantStubAndMaybeSummarize(sessionId, session.context)`. The helper creates an assistant stub message and, when `count >= 50`, builds a lightweight summary from the last 10 msgs (chronological) and updates `Session.context.conversationSummary`. File: `src/modules/chat/chat.service.ts`.
- Tests: Extended `chat.service.spec.ts` to assert assistant stub creation and summary trigger behavior; existing conversation/service and WS tests remain green.
- Edge handling: Content non-empty enforced; session existence/ownership validated through `SessionsService`; summarization length capped (1,000 chars); safe merge into context when not an object.

Quality gates (after Pass 3)
- Build and type-check: PASS
- Lint: PASS (warnings only; no errors introduced)
- Unit/integration/e2e tests: PASS (10 suites, 93 tests)
- Smoke: PASS (assistant stub + summary flow exercised in unit tests)

Requirements coverage
- 2.2 Session validation on chat actions — Done (ChatService checks via SessionsService)
- 2.6 Conversation persistence, listing, and retrieval — Done (repo pagination + history helpers)
- 5.5 Summarization into session context — Done (basic summarizer; to be refined with token counts in Pass 4)

Follow-ups
- Replace assistant stub with real streamed LLM responses (Pass 4) and wire WS chunk emission.
- Add token-aware summarization and maintain rolling summary/context window.
- Expose a DTO for paginated history over HTTP with validation and consistent ordering config.

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
