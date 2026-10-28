# Security & Compliance

- **Tenant Isolation**: Every row includes `tenant_id`. All queries must filter by `tenant_id`.
- **Audit Trail**: Log prompt, retrieved snippet hashes, model id, router decision, validator results.
- **Fail‑Closed**: If citations or required validators fail, withhold response or return refusal.
- **Access Control**: Require authenticated user session; store `user_id`/role in `ai_chat_log`.
- **Data Residency**: Respect site policy (on‑prem only vs cloud). Use routing rules accordingly.
- **Model Governance**: Version all model configs, prompts, and validators. Treat changes as DCRs.
