# Recruitment Agent Project Overview

A topic‑agnostic, extensible conversational agent for recruitment with a clear path to reuse across domains (support, sales, onboarding). This executive summary highlights purpose and scope, and links to the canonical documents for details.

## Purpose

- Deliver a ChatGPT‑like recruiting assistant with persistent memory, iterative requirement discovery, web/candidate search, and key integrations.
- Keep the base architecture topic‑agnostic to enable reuse in other products.

## Highlights

- Topic‑agnostic core and modular integrations (Next.js frontend, NestJS backend).
- RAG‑grounded responses using vector search and retrieved context.
- Simple MVP first; add specialized agents and routers as we scale.

## Read Next

- Architecture and Requirements (canonical): [Architecture_and_Requirements.md](./Architecture_and_Requirements.md)
- Feature Roadmap (P0 → P2): [Features.md](./Features.md)
- Extensible Architecture (plugins/config/shared components): [Extensible_Architecture_Agent.md](./Extensible_Architecture_Agent.md)

## Notes

- Use past SoftAims leads/projects for synergy suggestions and memory.
- Include city and YoE as first‑class search parameters.
