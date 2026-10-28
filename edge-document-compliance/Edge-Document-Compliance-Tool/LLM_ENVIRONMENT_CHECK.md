# LLM Environment Variables Check

**Date:** December 2024  
**Purpose:** Verify LLM configuration for Vera

---

## Environment Variables Expected by Vera

Vera uses the following environment variables for LLM integration:

### Required Variables (for LLM to work):

```bash
VERA_LLM_PROVIDER=local_http          # Options: "local_http", "noop" (default)
VERA_LLM_ENDPOINT=http://localhost:8000/generate  # HTTP endpoint for local LLM
VERA_LLM_API_KEY=...                  # Optional API key if required
```

### Optional Variables:

```bash
# Embedding Configuration (for semantic search)
EMBEDDING_PROVIDER=tfidf              # Options: tfidf, ollama, mistral, openai
EMBEDDING_MODEL=tfidf-local           # Model name
EMBEDDING_DIMENSION=1536              # Embedding dimension
```

---

## Local Environment Check Results

**Status:** ✅ No LLM variables found locally (expected)

**Findings:**
- No `VERA_LLM_*` variables set locally
- No `.env` file found in project root
- This is **expected** - environment variables should be set on Railway

---

## Railway Environment Variables

To check Railway environment variables:

1. **Go to Railway Dashboard:**
   - Navigate to: https://railway.app
   - Select your project: **EDCAT-Administrator**
   - Click on your service/deployment

2. **Check Variables Tab:**
   - Click on **"Variables"** tab
   - Look for:
     - `VERA_LLM_PROVIDER`
     - `VERA_LLM_ENDPOINT`
     - `VERA_LLM_API_KEY`
     - `EMBEDDING_PROVIDER`
     - `EMBEDDING_MODEL`
     - `EMBEDDING_DIMENSION`

3. **Current Expected Configuration:**

   **If LLM is NOT configured (default):**
   ```
   VERA_LLM_PROVIDER=noop
   # (or variable not set)
   ```
   - Vera will use legacy response pipeline
   - No external LLM calls will be made
   - All responses come from templates and database queries

   **If LLM IS configured:**
   ```
   VERA_LLM_PROVIDER=local_http
   VERA_LLM_ENDPOINT=http://your-llm-server:8000/generate
   VERA_LLM_API_KEY=your-api-key  # Optional
   ```
   - Vera will make HTTP POST requests to the endpoint
   - Uses RAG (Retrieval-Augmented Generation) pipeline
   - Falls back gracefully if LLM unavailable

---

## How to Check Railway Variables via CLI

If you have Railway CLI installed:

```bash
railway variables
```

Or to check specific variable:

```bash
railway variables get VERA_LLM_PROVIDER
railway variables get VERA_LLM_ENDPOINT
```

---

## How Vera Handles Missing LLM Configuration

**Default Behavior (VERA_LLM_PROVIDER=noop or not set):**

1. `VeraLLMBridge.callVeraLLM()` detects no configuration
2. Returns fallback message: `"[LLM_DISABLED] Vera's generative core is not configured..."`
3. `VeraCoreEngine` falls back to legacy template-based responses
4. All responses come from:
   - Q&A response bank (`edcat.vera_query_response_bank`)
   - Terminology service (`edcat.terms_and_definitions`)
   - Template system (`edcat.vera_response_templates`)
   - Database queries and context building

**This is the expected and working configuration** - Vera does NOT require an external LLM to function.

---

## Code References

**LLM Bridge:**
- `backend/src/services/vera/VeraLLMBridge.ts` (lines 40-50)
- Checks: `process.env.VERA_LLM_PROVIDER` and `process.env.VERA_LLM_ENDPOINT`

**Embedding Service:**
- `backend/src/services/vera/VeraSemanticMemory.js`
- Checks: `process.env.EMBEDDING_PROVIDER`, `process.env.EMBEDDING_MODEL`

---

## Summary

✅ **Current Status:** No LLM variables set locally (expected)  
✅ **Vera Functionality:** Works without LLM (uses legacy pipeline)  
✅ **Next Step:** Check Railway dashboard for production environment variables

**Note:** Vera is designed to work **without** an external LLM. The LLM integration is optional and provides enhanced responses when configured.

