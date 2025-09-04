# Product Overview

## Recruitment Agent Platform

A topic-agnostic, extensible conversational AI platform designed for recruitment workflows with the flexibility to expand into other domains like customer support, sales qualification, and onboarding.

### Core Purpose
- ChatGPT-like recruiting assistant with persistent memory
- Iterative requirement discovery for roles and candidates
- Web search and candidate research capabilities
- RAG-grounded responses using retrieved context
- Modular architecture enabling domain reuse

### Key Principles
- **Topic-agnostic core**: Reusable base across domains with minimal code changes
- **Simple first, extensible later**: MVP approach with clear expansion path
- **Grounded AI**: Prefer RAG and retrieved context over speculation
- **Modular integrations**: Swappable providers for search, LLMs, vector DBs
- **Vendor independence**: Use abstractions to avoid lock-in

### Current Status
This is a NestJS TypeScript starter repository being developed into the recruitment agent platform. The architecture supports a phased approach from P0 (MVP) through P2 (advanced features).