import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

/** Minimal idempotent upserter for blueprints + Vera rules. */
export async function loadSeeds(pg: Client, tenant_id: string, dir = './') {
  const bpDir = path.join(dir, 'blueprints');
  const polDir = path.join(dir, 'policies');
  const prDir = path.join(dir, 'prompts');

  // upsert vera rules
  const vera = JSON.parse(fs.readFileSync(path.join(polDir, 'vera_follow_rules.json'),'utf-8'));
  await pg.query(`
    INSERT INTO ai_policy (tenant_id, name, content)
    VALUES ($1, $2, $3::jsonb)
    ON CONFLICT (tenant_id, name) DO UPDATE SET content=EXCLUDED.content
  `,[tenant_id, 'vera.follow.rules', JSON.stringify(vera)]);

  const sysPrompt = fs.readFileSync(path.join(prDir,'system.vera.follow_rules.txt'),'utf-8');
  await pg.query(`
    INSERT INTO ai_prompt (tenant_id, persona_code, kind, name, content)
    VALUES ($1,'vera','system','system.follow.rules',$2)
    ON CONFLICT (tenant_id, persona_code, kind, name) DO UPDATE SET content=EXCLUDED.content
  `,[tenant_id, sysPrompt]);

  // upsert blueprints
  const files = fs.readdirSync(bpDir).filter(f=>f.endsWith('.json'));
  for (const f of files) {
    const bp = JSON.parse(fs.readFileSync(path.join(bpDir,f),'utf-8'));
    const std = bp.standard;
    const result = await pg.query(`
      INSERT INTO ai_standard (tenant_id, code, revision, title, authority, citation_style, parser_profile, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (tenant_id, code, revision) DO UPDATE SET title=EXCLUDED.title, authority=EXCLUDED.authority, metadata=EXCLUDED.metadata
      RETURNING id
    `,[tenant_id, std.code, std.revision, std.title, std.authority, std.citation_style, std.parser_profile, std.metadata || {}]);
    const standard_id = result.rows[0].id;

    for (const [i,c] of (bp.clauses||[]).entries()) {
      await pg.query(`
        INSERT INTO ai_clause_blueprint (tenant_id, standard_id, clause_id, label, parent_clause_id, order_index, ontology_tags)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (tenant_id, standard_id, clause_id) DO UPDATE SET label=EXCLUDED.label, parent_clause_id=EXCLUDED.parent_clause_id, order_index=EXCLUDED.order_index, ontology_tags=EXCLUDED.ontology_tags
      `,[tenant_id, standard_id, c.clause_id, c.label || null, c.parent || null, c.order_index ?? i, c.ontology_tags || []]);
    }

    for (const fam of (bp.crosswalk_targets||[])) {
      await pg.query(`
        INSERT INTO ai_crosswalk_blueprint (tenant_id, standard_id, target_family)
        VALUES ($1,$2,$3)
        ON CONFLICT (tenant_id, standard_id, target_family) DO NOTHING
      `,[tenant_id, standard_id, fam]);
    }
  }
}
