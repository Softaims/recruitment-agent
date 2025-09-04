# Designing a Topic‑Agnostic and Extensible Architecture

This document outlines how to design a topic‑agnostic, plugin‑driven platform centered on LangGraph so the same core can power recruitment, customer support, sales qualification, onboarding, and more—without rewriting foundational systems. The reference implementation uses Next.js for the frontend and NestJS with strict three-layer architecture (Controllers/Services/Repositories) for the backend, following our established coding standards.

## 2.3 Topic‑Agnostic Architecture: Rationale

A key requirement is a “topic‑agnostic” base that can be extended to new domains beyond recruitment. Investing in a reusable conversational engine, user management, and integration layer lets us launch additional products (e.g., support bot, sales assistant, onboarding tool) by swapping domain plugins rather than altering core systems.

LangGraph’s graph‑based, state‑driven design fits this goal. By abstracting core components and using a plugin model, we can adapt to new use cases without fundamental rewrites. For overall system architecture and RAG details, see the [Architecture and Requirements Guide](./Architecture_and_Requirements.md).

## 2.3.1 Principles of Agnostic AI: Flexibility and Vendor Independence

### Flexibility via Decoupling and Abstractions

- Decouple core logic from domain specifics. The chat UI, orchestration engine (LangGraph), and user management should not “know” domain entities like job, candidate, or skill.
- Operate on abstract concepts: tasks, entities, workflows.
- Encapsulate domain logic in interchangeable plugins (e.g., job‑description parsing, candidate matching), enabling reuse across domains (e.g., replace with support‑ticket parsing, product knowledge, customer intents).

### Vendor Independence by Design

- Avoid tight coupling to any single provider (LLM, search, comms). Use an abstraction layer such as OpenRouter for LLMs to switch among providers (OpenAI, Anthropic, etc.) based on cost/performance without changing core code.
- Provide pluggable adapters for search (e.g., Tavily, Bing, custom) and communication channels (web chat, Slack, Teams).
- Benefits: mitigates risk from outages, deprecations, or price hikes; supports strategic, merit‑based provider selection.

## 2.3.2 Plugin Architecture and Configuration‑Driven Workflows

A plugin‑based architecture is the most effective pattern for topic‑agnostic design.

- Core services: auth, session management, conversational interface, and LangGraph orchestration.
- Plugins: self‑contained modules with well‑defined interfaces; dynamically loaded/executed by the core.
- Recruitment plugins (examples): job‑description parsing, LinkedIn candidate search, resume analysis, outreach email generation.
- Each plugin bundles its logic and dependencies.

### Configuration Over Code

- Drive behavior via configuration, not hard‑coding.
- Construct LangGraph workflow graphs dynamically from config files or rules.
- Example: recruitment config composes nodes for job parsing, candidate search, and email generation; customer support config composes ticket triage, KB search, and solution suggestion.
- Outcome: extend to new domains by building new plugins + adding a new config; no core code changes. This reduces time‑to‑market and simplifies maintenance.

## 2.3.3 Shared Components for Cross‑Platform Reusability

Build robust, reusable shared components to accelerate all future apps on the platform.

### Core Shared Components

- **Conversational AI Engine**
  - Powered by LangGraph; manages conversation state and task orchestration
  - Domain‑agnostic; receives which workflow/graph to run and which plugins to load via configuration
  - Implemented as NestJS services following three-layer architecture

- User Management and Profiling System
  - Centralized auth, authorization, and profile management.
  - Persistent memory: store user “quirks” and preferences; share across apps (recruitment, sales, support) for unified personalization.

- Integration Orchestrator
  - Single layer for external services (LLMs via OpenRouter, search APIs, LinkedIn, etc.).
  - Handles auth, rate limiting, retries, and data transformation.
  - Prevents duplication and centralizes control over third‑party dependencies.

## Implementation Architecture

### NestJS Three-Layer Architecture

The shared components follow strict three-layer architecture:

- **Controllers**: Thin orchestration (route handling, validation, response shaping)
- **Services**: Business logic only (delegate database operations to repositories)  
- **Repositories**: All Prisma/database operations with type-safe queries

### Authentication & Security

- JWT authentication via HTTP-only cookies (primary) with Authorization header fallback
- @HttpUser() decorator for extracting authenticated users in controllers
- ApiResponse patterns with global exception filters for consistent error handling

### Database & Persistence

- PostgreSQL with Prisma ORM for type-safe database operations
- Repository pattern enforcing separation between business logic and data access
- Declarative migrations with Prisma Migrate for schema management
- Redis for session caching and frequently accessed data

## Strategic Outcome

By building these shared components and a plugin/config‑driven core, we create not only a powerful recruitment bot but also a foundation for a multi‑product AI platform. This maximizes ROI on initial investment and enables rapid expansion into new markets with minimal engineering overhead.
