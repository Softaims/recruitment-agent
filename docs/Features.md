# Feature Roadmap

This document outlines staged capabilities for the Recruitment Agent platform across three phases: P0 (MVP), P1 (early iteration), and P2 (advanced platform).

## 3.2.1 P0 Features: Core Chat Interface, Basic AI Integration, Simple Search

P0 (Core MVP Features):

- Basic Chat Interface: A simple, web‑based chat UI similar to ChatGPT where recruiters interact with the bot. Primary user‑facing component; must be intuitive and responsive.
- Conversational Requirement Discovery: The AI engages in dialogue to uncover role requirements, including technical skills (e.g., “Python,” “Django”) and non‑technical attributes (e.g., “team player,” “remote work experience”).
- Simple Candidate Search: Integrate a basic search API (e.g., simplified Tavily or a public job board API) to find potential candidates based on discovered requirements.
- User Profile and Memory: A basic system to store user preferences and learn from past interactions, allowing the bot to remember a recruiter’s quirks and preferences across sessions.

## 3.2.2 P1 Features: Memory Systems, Improved Matching, Basic Integrations

P1 (Early Iteration Features):

- Enhanced Memory and Context: A more sophisticated memory system that builds a richer profile of the company, its projects, and the recruiter’s long‑term preferences.
- Improved Matching Algorithm: Move beyond keyword matching toward semantic understanding of skills and experience, potentially using a simple vector database.
- Basic Integrations: Connect with one or two key external systems (e.g., a popular ATS or LinkedIn via Unipile) to pull candidate data and push qualified leads.
- Resource Suggestions: Bot suggests relevant resources (e.g., articles, salary benchmarks) based on the conversation.

## 3.2.3 P2 Features: Advanced Agents, Complex Workflows, Analytics Dashboard

P2 (Advanced Platform Features):

- Specialized Agents: Introduce agents for distinct tasks (e.g., job description generation, applicant response analysis).
- Intelligent Model/Agent Router: Dynamically select the best AI model or agent for a task based on cost, speed, or accuracy requirements.
- Analytics Dashboard: Provide a dashboard for recruiters and hiring managers to track key metrics (e.g., time‑to‑hire, source of hire, candidate quality).
- Ingestion Pipeline: Enable batch upload of company leads or candidate data for research and analysis.
