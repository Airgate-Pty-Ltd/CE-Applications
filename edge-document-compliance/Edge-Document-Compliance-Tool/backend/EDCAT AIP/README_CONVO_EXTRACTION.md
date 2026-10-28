# EDCAT Conversational Intelligence + Deep Requirement Extraction Pack

This pack extends the prior seeds with **GPT‑style conversational behaviors** and a **requirements mining pipeline** that can “worm through” standards and customer documents to extract, normalize, and link requirements into the EDCAT database and retrieval index.

It includes:
- Conversational policies (clarification, hypothesis testing, progressive disclosure, confidence reporting)
- Intent router for dialog → tools
- Requirement object schema & extraction jobs
- Customer document ingestion & normalization
- SHALL/WILL detector & obligation parser (prompt templates + validators)
- Follow‑up question strategies and uncertainty handling
- Example API handlers for `/api/ai/extract` and `/api/ai/ingest`

> All content is idempotent and designed for Cursor to integrate quickly. Add these seeds to your existing EDCAT AI DB and mount the example handlers.
