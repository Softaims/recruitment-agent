# Recruitment Agent: Architecture and Requirements Guide

A topic‑agnostic, extensible conversational platform for recruitment—with a clean path to reuse across domains like customer support, sales qualification, and onboarding. This guide synthesizes goals, requirements, architecture, and a staged roadmap.

## 1. Goals and Guiding Principles

- Topic‑agnostic core: Reuse the base across domains with minimal code changes.
- Simple first, extensible later: MVP first; specialize via agents/routers when justified.
- Grounded AI: Prefer RAG and retrieved context over speculation.
- Modular integrations: Swappable providers for search, LLMs, vector DBs, and comms.
- Vendor independence: Use abstractions (e.g., OpenRouter) to avoid lock‑in.

## 2. Functional Requirements

### 2.1 Core Capabilities (MVP)

- Chat Interface: Multi‑turn chat UI (ChatGPT‑like), responsive and intuitive.
- Conversational Discovery: Iteratively elicit role requirements (technical + non‑technical).
- Web/Candidate Search: Query a search API (e.g., Tavily or similar) to find relevant projects/resources.
- Suggestions: Provide candidate/resource suggestions; consider LinkedIn via Unipile.
- Memory: Persist key profile details and learn user quirks across sessions.

### 2.2 Post‑MVP Enhancements

- Parameterized Search: Filters such as city and years of experience (YoE).
- Specialized Agents: Job‑description generator; applicant fit analyzer.
- Intelligent Router: Multi‑model/agent selection based on cost, speed, or accuracy.
- Leads Ingestion: Batch research on SoftAims leads; proactive suggestion for high‑demand areas.
- Scheduling: Email/calendar APIs for interview booking.

## 3. Product Roadmap (P0 → P2)

### 3.1 P0 (MVP)

- Chat UI, conversational requirement discovery.
- Simple candidate search via a basic API integration.
- Basic profile and memory to recall recruiter preferences.

### 3.2 P1 (Early Iteration)

- Enhanced memory and context (company, projects, recruiter preferences).
- Improved matching with semantic understanding (vector DB).
- Initial integrations (e.g., ATS or LinkedIn via Unipile).
- Resource suggestions (articles, salary benchmarks).

### 3.3 P2 (Advanced Platform)

- Specialized agents for distinct tasks (JD generation, response analysis).
- Intelligent model/agent router.
- Analytics dashboard (time‑to‑hire, source of hire, candidate quality).
- Ingestion pipeline for batch leads/candidate data.

## 4. Non‑Functional Requirements

- Reliability: Idempotent tools; retries for transient failures; rate limiting.
- Performance: Low‑latency chat; streaming responses; efficient retrieval.
- Security: AuthN/AuthZ; least‑privilege for integrations; secrets management.
- Observability: Tracing, logs, metrics; evaluation of model outputs.
- Cost control: Budgets/alerts; token limits; caching; batching.

## 5. System Architecture

### 5.1 Frontend

- Web chat UI in Next.js (React-based).
- Transport: WebSocket or HTTP (SSE/long‑poll) for near‑real‑time messaging.

### 5.2 Backend

- NestJS application providing APIs, WebSocket endpoints, and orchestration services.
- Encapsulate integrations (search, LinkedIn, vector DB) as NestJS modules/providers.

### 5.3 LLM and Orchestration

- Model access via API (e.g., Groq Llama‑3‑70B, ~8k tokens).
- Orchestrate RAG/memory/tools via LangChain or LlamaIndex; use LangGraph/LangSmith for graph workflows and observability.

### 5.4 Data and Memory

- Structured data: Postgres (roles, candidates, metadata, settings).
- Session/cache: Redis.
- Vector DB: Milvus or Pinecone for long‑term memory and knowledge base.
- Embeddings: Store chat turns, role descriptions, candidate profiles, relevant docs.

### 5.5 RAG Flow

1. Capture user input and state.
2. Embed salient content; write to vector DB.
3. Retrieve top‑k relevant memories/docs.
4. Construct prompt with retrieved context and system instructions.
5. Call LLM; stream output.
6. Update transcripts and memory stores.

### 5.6 Integrations

- Search: Tavily or alternative.
- Professional Networks: LinkedIn via Unipile (or official API) for profile retrieval and outreach.
- Scheduling: Email/calendar APIs for interviews.
- LLM Access: OpenRouter for multi‑provider choice and cost optimization.

## 6. Extensibility: Topic‑Agnostic, Plugin‑Driven Design

### 6.1 Principles

- Decouple core logic from domain specifics; operate on abstract concepts (tasks, entities, workflows).
- Encapsulate domain logic in plugins; swap recruitment plugins with support/sales/onboarding plugins.
- Maintain vendor independence via adapter layers for LLMs, search, and comms.

### 6.2 Plugin Architecture

- Core services: auth, sessions, chat interface, LangGraph orchestration.
- Plugins: self‑contained modules with well‑defined interfaces; dynamically loaded.
- Examples (recruitment): job‑description parsing, LinkedIn search, resume analysis, outreach email generation.

### 6.3 Configuration‑Driven Workflows

- Compose LangGraph graphs from configuration or rules.
- Recruitment config: nodes for job parsing, candidate search, email generation.
- Customer support config: nodes for ticket triage, KB search, solution suggestion.
- Outcome: extend to new domains by adding plugins + configs without touching core.

### 6.4 Shared Components

- Conversational engine (LangGraph) for stateful orchestration.
- User management and profiling with persistent memory (share across apps).
- Integration orchestrator handling auth, rate‑limits, retries, and data transforms.
- Analytics/monitoring dashboard for engagement, latency, token usage, task success.

## 7. Cost Management

- Open‑source first: spaCy, Hugging Face; reuse pre‑trained models.
- OpenRouter for model choice and price/performance optimization.
- Efficiency: cache FAQs/retrievals, concise prompting, batching, streaming.
- Governance: budgets and alerts; monitor usage/latency/cost per feature.

## 8. MVP Scope and Anti‑Over‑Engineering

Start with a single, capable conversational agent that manages the recruiting workflow end‑to‑end. Add specialized agents and routers later as usage justifies. Build a testable foundation and avoid premature complexity.

## 9. Key Technologies

- LLMs: Groq Llama‑3‑70B (8k context) via API; OpenRouter as multi‑model access layer.
- RAG Stack: Vector DB (Milvus/Pinecone), Redis, Postgres.
- Orchestration: LangChain, LlamaIndex, LangGraph/LangSmith.
- Integrations: Tavily (search), Unipile/LinkedIn, Email/Calendar APIs.
- Frontend: Next.js (React) with WebSocket/HTTP connectors.
- Backend: NestJS for APIs, WebSockets, and orchestration.

## 10. Notes

- Use past SoftAims leads/projects for synergy suggestions and memory.
- Include filters such as city and YoE as first‑class search parameters.
