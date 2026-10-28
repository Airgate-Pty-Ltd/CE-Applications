# Addendum: Rich Seeds for GAP, Terminology, Output Strategies, and Rewrites

This addendum expands the starter kit with **production‑grade seeds**:
- GAP playbooks and heuristics
- Terminology/definition canon with auditor vs organization usage notes
- Output strategies (by document type) with style constraints
- Rewrite suggestions library (classifier + fix prompts)
- Evidence exemplars and objective‑evidence scaffolds
- Cross‑mapping rules and suggested alignments
- Evaluation rubrics for clause accuracy, hallucination, formatting, and style

All files are idempotent JSON seeds intended for the tables created by `schema/edcat_ai.sql`:
- `ai_template` (additional templates & playbooks)
- `ai_policy` (output strategies; mapping heuristics)
- `ai_validator` (expanded checks)
- `ai_prompt` (repair, rewrite, and suggestion prompts)
