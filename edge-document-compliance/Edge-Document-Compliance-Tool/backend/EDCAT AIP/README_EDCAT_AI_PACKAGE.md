# EDCAT AI Personality & Intelligence Starter Package

This package provides a **drop-in onboarding kit** for Cursor to integrate EDCAT's AI personality (“Vera”), guardrails, retrieval-first prompts, routing policies, and database persistence. It also includes an OpenAPI contract and example server handlers to connect the AI to the EDCAT chat UI and database.

> **Goal:** Ensure Cursor can (1) create the necessary DB tables, (2) seed initial AI personality/config data, and (3) wire chat to retrieval, validators, and routing (GPT‑Lite + on‑prem fallback).

---

## Contents

- `schema/edcat_ai.sql` — Postgres schema & migrations (idempotent).
- `seed/personalities.json` — Persona profiles (Vera + Console Assistant).
- `seed/prompts_system.json` — System prompts, role headers, style rules.
- `seed/tool_policies.json` — Tool invocation policies & tool registry.
- `seed/retrieval_templates.json` — Retrieval/prompt templates with citation rules.
- `seed/validators.json` — Structural/style validators & refusal policies.
- `seed/routing_policies.json` — Model routing (cloud GPT‑Lite vs on‑prem student).
- `api/contracts/ai_chat_api.yaml` — OpenAPI spec for chat endpoints.
- `api/contracts/ai_bus_schema.json` — Message bus schema for inter‑agent calls.
- `server/examples/chat_handler.ts` — Reference handler for `/api/ai/chat` (TypeScript/Node).
- `server/examples/router.ts` — Example router wiring for Express/Fastify.
- `server/examples/db_integration.sql` — Example insert/select queries & seeds.
- `tests/edcat_ai.postman_collection.json` — Example Postman collection.
- `config/.env.sample` — Env var placeholders.
- `SECURITY.md` — Security, RBAC, audit trail requirements.
- `LICENSE.txt` — Placeholder for your license text.

---

## Quickstart for Cursor

1. **Create DB objects**  
   Apply `schema/edcat_ai.sql` to your Postgres (EDCAT DB). It is idempotent.

2. **Seed data**  
   Insert JSON seeds with `server/examples/db_integration.sql` _or_ load each file as JSONB into the corresponding tables:
   - `ai_persona`, `ai_prompt`, `ai_policy`, `ai_template`, `ai_validator`, `ai_router`.

3. **Wire API**  
   - Implement `/api/ai/chat` per `api/contracts/ai_chat_api.yaml` using `server/examples/chat_handler.ts` as a template.
   - Mount `router.ts` in your existing server and point your Chat UI to `/api/ai/chat`.

4. **Connect Retrieval**  
   Ensure your retrieval service (vector DB or full‑text) supports **page/line anchors**. The example handler assumes a `retrieve(snippetSpec)` function returning `{doc_id, page, line_start, line_end, text}`.

5. **Enforce Validators (Fail‑Closed)**  
   Run the validators defined in `seed/validators.json` on every response. If any check fails, the handler auto‑requests a corrected answer or refuses with a helpful message.

6. **Routing**  
   Configure environment variables to enable **dual‑engine routing** (cloud GPT‑Lite vs on‑prem student). See `.env.sample` and `seed/routing_policies.json`.

7. **Audit Trail**  
   Persist every exchange to `ai_chat_log` with prompt hash, retrieved context hashes, model id, validator results, and decision trace (router, tools used).

---

## Design Principles

- **Retrieval‑First**: Model must answer only from supplied context; otherwise refuse or ask for the document.
- **Citations Required**: Clause answers must include `[Source: doc_id pX Lx–Ly]` per snippet.
- **House Style**: Procedures state *what* (no how‑to), single spacing, paragraph headers, correct numbering, MDL linkage text.
- **Fail‑Closed**: If citations/formatters fail, do not return an answer.
- **Determinism**: Prefer fixed temperature and seeded sampling for auditability.
- **Tenant Isolation**: All rows contain `tenant_id`; never cross tenants.

---

## Integration Notes

- Replace placeholder model names with your chosen engines.
- Replace retrieval adapter with your implementation (vector DB / Postgres FTS / hybrid). 
- Keep `ai_chat_log` growth under control via retention jobs and category archiving.

