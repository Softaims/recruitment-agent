# Recruitment Agent Project (Topic‑Agnostic Base)

A topic‑agnostic, extensible conversational agent for recruitment that can later be reused for other domains (support, sales, onboarding). The system centers on a chat experience, persistent memory, iterative discovery, web/candidate search, and integrations, with a simple MVP and a clear path to multi‑agent orchestration.

## Goals and Principles

- Topic‑agnostic core: Base architecture must be reusable across domains with minimal code changes.
- Simple first, extensible later: Ship a robust MVP; add specialized agents and routing only when needed.
- Grounded AI: Prefer RAG and retrieved context over model speculation.
- Modular integrations: Search, LinkedIn/Unipile, email/calendar, and data stores are swappable modules.

## Requirements Overview

- Chat interface similar to ChatGPT (multi‑turn, real‑time feel).
- Learns a user’s quirks/preferences across conversations beyond initial profile.
- Iterative discovery flow to elicit role requirements (technical and non‑technical).
- Web search to find similar projects/resources (e.g., Tavily or equivalent).
- Candidate/resource suggestions; LinkedIn integration via Unipile considered.
- Expand search via parameters (e.g., city, years of experience).
- Suggest synergies for pre‑existing roles using memory (including SoftAims projects, where relevant).
- Specialized agents for specific tasks (e.g., auto‑generating job descriptions, assessing candidate‑role fit) with an intelligent model router.
- Optionally, fine‑grained subject‑matter agents (e.g., deep Django or Ruby on Rails knowledge).
- Ingestion pipeline for SoftAims leads (from “responded” cutoff) to enable batch research and proactive candidate suggestions for high‑demand areas.
- Tooling for scheduling (email/calendar APIs) for interviews.

## Business Value Proposition

The bot sources candidates from platforms like LinkedIn, GitHub, and Stack Overflow. Using advanced search and filtering, it identifies individuals with required skills/experience—even passive candidates—accelerating sourcing and improving match quality.

## Feature Prioritization

### Core (MVP)

- Chat Interface: Multi‑turn chat UI with basic styling.
- LLM Integration: Connect to chosen LLM(s) for responses.
- User Context & Memory: Persist key profile details and conversation history; recall across sessions.
- Interactive Discovery: Probing questions to refine role requirements.
- Search Integration: Call a search API (e.g., Tavily) to retrieve relevant projects/resources.

### Nice‑to‑Have (Post‑MVP)

- Specialized agent for auto‑generating job descriptions.
- LinkedIn/Unipile integration for candidate lookup/outreach.
- Parameterized filtering (city, experience).
- Multi‑model router for selecting the best model/agent per task.
- Leads ingestion and batch candidate suggestions.

## Technical Architecture

### Frontend

- Web chat UI built with Next.js (React-based).
- Transport: WebSocket or HTTP (SSE/long‑poll) for near‑real‑time messaging.

### Backend

- API and orchestration server built with NestJS.
- Exposes chat endpoints/WS, tools, retrieval, and integration adapters.

### LLM and Orchestration

- Primary model access via API (e.g., Groq’s Llama‑3‑70B, ~8k context window).
- Over‑reliance on AI is risky; mitigate via Retrieval‑Augmented Generation (RAG).
- Orchestrate memory, tools, and RAG using LangChain or LlamaIndex; consider LangGraph/LangSmith for structured graph workflows and observability. NestJS modules encapsulate tools and providers.

### Data and Memory

- Structured data: Postgres (roles, candidates, conversations metadata, settings).
- Session state/cache: Redis.
- Long‑term memory and knowledge base: Vector database (e.g., Milvus, Pinecone).
- Embeddings: Store embeddings for chat messages, role descriptions, candidate profiles, and knowledge docs.
- Retrieval: On each turn, run similarity search to fetch relevant past context to ground responses.

### RAG Flow (Conceptual)

1. Capture user input and current system state.
2. Embed and store salient content in vector DB.
3. Retrieve top‑k relevant memories and documents.
4. Build the prompt with retrieved context and system instructions.
5. Call the LLM; stream response back to UI.
6. Update conversation transcript and memory stores.

### Integrations

- Search APIs: Tavily (or equivalent) for web results (related job postings, projects, docs).
- LinkedIn via Unipile (or official API): Profile retrieval, messaging, outreach; Recruiter/Sales Navigator support.
- LLM frameworks: LangChain or LlamaIndex for RAG/memory/tooling; LangGraph/LangSmith for multi‑agent graphs, conversational memory, and routing.
- Scheduling: Email/calendar APIs for booking interviews.

## Tool Justification: LangGraph

Recruiting is inherently iterative: action → observation → reasoning → refinement. LangGraph’s graph‑based, stateful design models this loop well:

- Graph nodes perform actions (e.g., search, summarize, propose next steps).
- Conditional edges route based on user feedback or state.
- Supports cycles/loops for controlled, multi‑turn refinement.
- Encourages maintainable, non‑linear workflows that are difficult to express cleanly with linear chains.

This yields an interactive assistant that collaborates with recruiters through evolving requirements and results, while maintaining explicit control over state and transitions.

## Topic‑Agnostic, Extensible Design

Design for reuse beyond recruitment by separating concerns:

- Core platform (domain‑agnostic):
  - Conversation engine (turn handling, memory, RAG, tool execution).
  - State model and orchestration (LangGraph‑style graphs and routers).
  - Integration adapters (search, vector DB, relational DB, auth).
- Domain plugins (recruitment, support, sales, onboarding):
  - Prompts, tools, schemas, UI tweaks, evaluators.
- Configuration over code: Select agents, tools, models, prompts via config, not hard‑coded logic.
- Plugin lifecycle: Register, enable/disable, version, and route to plugins at runtime.

This approach enables adding specialized agents (e.g., job‑description generator or candidate‑fit analyzer) and fine‑grained subject agents (e.g., Django/RoR) without changing the core.

## Cost Management (HuggingFace/OpenRouter)

Reduce model and infra spend while preserving quality:

- Prefer open‑source libraries (spaCy, Hugging Face Transformers) and reuse pre‑trained models.
- Use OpenRouter to access multiple models at competitive prices; pick best‑fit per task.
- Efficiency practices:

  - Cache high‑frequency answers and retrievals.
  - Prompt for concise outputs; control token budgets.
  - Batch operations where possible; stream results.
- Governance:

  - Set monthly budgets and alerts in OpenRouter.
  - Monitor usage, latency, and cost per feature to guide optimizations.

## MVP Scope and Anti‑Over‑Engineering

Start with a single, capable conversational agent that manages the core recruiting workflow end‑to‑end. Defer multi‑agent specialization and complex routing until usage patterns justify them. Build a solid, testable foundation to avoid premature complexity and technical debt.

---

### Key Technologies Mentioned

- LLMs: Groq Llama‑3‑70B (8k context) via API; OpenRouter as multi‑model access layer.
- RAG Stack: Vector DB (Milvus/Pinecone), Redis, Postgres.
- Orchestration: LangChain, LlamaIndex, LangGraph/LangSmith.
- Integrations: Tavily (search), Unipile/LinkedIn (profiles/messaging), Email/Calendar APIs.
- Frontend: Next.js (React) with WebSocket/HTTP connectors.
- Backend: NestJS for API, tool adapters, and orchestration.

### Notes

- “SoftAims” references: use past leads/projects both for memory and synergy suggestions.
- Parameter expansion: include city and years of experience (YoE) as first‑class filters during search/refinement.
