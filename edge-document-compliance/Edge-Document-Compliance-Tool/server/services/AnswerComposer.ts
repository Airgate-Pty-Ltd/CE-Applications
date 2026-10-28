export function personaOpening(): string {
  return "Let's pin this down like an auditor would. Here's the exact requirement and your practical options.";
}

export function quoteClauses(regLabel: string, rows: Array<{clause_id: string; title?: string; text: string}>): string {
  const lines = rows.slice(0,3).map(r =>
    `**${r.clause_id}${r.title ? " — " + r.title : ""}**\n> ${r.text.trim()}`
  ).join("\n\n");
  return `**Source: ${regLabel}**\n\n${lines}`;
}

export function multiSolution(topic: string): string {
  if (/train|competence/.test(topic)) {
    return `**Practical Paths (Training/Competence)**  

**Option 1: Role-based competence matrix + training plan**  

*Best when:* release authority or special processes require proof.  

*Advantages:* aligns to clause language; strong traceability.  

*Trade-offs:* maintenance effort as roles change.



**Option 2: On-the-job evaluation with pass/fail criteria**  

*Best when:* hands-on roles or variable work mixes.  

*Advantages:* real capability evidence.  

*Trade-offs:* define clear acceptance criteria; manage sampling bias.`;
  }
  return `**Practical Paths (General Compliance Control)**  

**Option 1: Documented procedure + controlled records**  

*Advantages:* meets the "shall" directly; low complexity.  

*Trade-offs:* manual upkeep.



**Option 2: Workflow system with roles and gates**  

*Advantages:* scalable; strong audit trails.  

*Trade-offs:* system validation and training needed.`;
}

export function auditorFollowups(topic: string): string {
  const base = [
    "Which process or location is in scope (Production, Repair, Engineering, Warehouse)?",
    "Do you need procedure-level control or records evidence for this requirement?",
    "Is this for initial approval or ongoing monitoring?"
  ];
  if (/train|competence/.test(topic)) base.unshift("Do you need role-based matrices or only training records for release authority?");
  return `**Auditor follow-ups:**\n- ${base.slice(0,3).join("\n- ")}`;
}

