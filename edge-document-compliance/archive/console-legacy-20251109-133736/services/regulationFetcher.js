const { query, transaction } = require('../database/db');
const { extractRequirements } = require('./requirementExtractor');

let catalog;

function loadCatalog() {
  if (!catalog) {
    // Lazy load to avoid issues when the file is not present during tests
    // eslint-disable-next-line global-require
    catalog = require('../config/regulatory-catalog.json');
  }
  return catalog;
}

function normaliseText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchRemoteText(url) {
  const fetchImpl = global.fetch || (await import('node-fetch')).default;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetchImpl(url, { signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Timed out fetching ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const body = await response.text();
  return normaliseText(body);
}

async function upsertRequirementSet(entry, requirements, { error = null } = {}) {
  const syncedAt = new Date().toISOString();
  const newCount = Array.isArray(requirements) ? requirements.length : 0;

  const existing = await query(
    "SELECT * FROM requirement_sets WHERE metadata ->> 'catalog_id' = $1 LIMIT 1",
    [entry.id]
  );

  if (existing.rows.length) {
    const existingRow = existing.rows[0];
    const setId = existingRow.id;
    const existingMetadataRaw = existingRow.metadata || {};
    const existingMetadata =
      typeof existingMetadataRaw === 'string' ? JSON.parse(existingMetadataRaw) : existingMetadataRaw;
    const previousCount =
      typeof existingMetadata.requirement_count === 'number' ? existingMetadata.requirement_count : null;

    let syncStatus = 'ok';
    if (error) {
      syncStatus = 'error';
    } else if (previousCount === null) {
      syncStatus = newCount > 0 ? 'updated' : 'ok';
    } else if (previousCount !== newCount) {
      syncStatus = 'updated';
    }

    const mergedMetadata = {
      ...existingMetadata,
      catalog_id: entry.id,
      group: entry.group,
      jurisdiction: entry.jurisdiction,
      source_url: entry.source_url,
      last_synced_at: syncedAt,
      last_sync_status: syncStatus,
      last_sync_error: error,
      previous_count: previousCount,
      requirement_count: newCount
    };

    await query(
      'UPDATE requirement_sets SET metadata = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(mergedMetadata), setId]
    );

    if (requirements.length) {
      await transaction(async (client) => {
        await client.query('DELETE FROM requirements WHERE requirement_set_id = $1', [setId]);
        for (const requirement of requirements) {
          await client.query(
            `INSERT INTO requirements (requirement_set_id, requirement_id, clause, requirement_text, source_name, source_type, category, keywords)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              setId,
              requirement.requirement_id,
              requirement.clause,
              requirement.requirement_text,
              requirement.source_name,
              requirement.source_type,
              requirement.category,
              requirement.keywords
            ]
          );
        }
      });
    }

    return existing.rows[0];
  }

  let syncStatus = 'ok';
  if (error) {
    syncStatus = 'error';
  } else if (newCount > 0) {
    syncStatus = 'updated';
  }

  const requirementSetResult = await query(
    `INSERT INTO requirement_sets (label, source_type, metadata)
     VALUES ($1, $2, $3::jsonb)
     RETURNING *`,
    [
      entry.name,
      'regulation',
      JSON.stringify({
        catalog_id: entry.id,
        group: entry.group,
        jurisdiction: entry.jurisdiction,
        source_url: entry.source_url,
        last_synced_at: syncedAt,
        last_sync_status: syncStatus,
        last_sync_error: error,
        previous_count: null,
        requirement_count: newCount
      })
    ]
  );

  const requirementSet = requirementSetResult.rows[0];

  if (requirements.length) {
    await transaction(async (client) => {
      for (const requirement of requirements) {
        await client.query(
          `INSERT INTO requirements (requirement_set_id, requirement_id, clause, requirement_text, source_name, source_type, category, keywords)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            requirementSet.id,
            requirement.requirement_id,
            requirement.clause,
            requirement.requirement_text,
            requirement.source_name,
            requirement.source_type,
            requirement.category,
            requirement.keywords
          ]
        );
      }
    });
  }

  return requirementSet;
}

async function fetchRegulation(catalogId) {
  const catalogEntries = loadCatalog();
  const entry = catalogEntries.find((item) => item.id === catalogId);

  if (!entry) {
    throw new Error(`Regulation with id '${catalogId}' not found in catalog`);
  }

  try {
    const text = await fetchRemoteText(entry.source_url);
    const requirements = extractRequirements({ text }, entry.name).map((req, index) => ({
      requirement_id: req.requirement_id || `${entry.id}-REQ-${index + 1}`,
      clause: req.clause,
      requirement_text: req.requirement_text,
      category: req.category,
      keywords: req.keywords || [],
      source_name: entry.name,
      source_type: 'regulation'
    }));

    const requirementSet = await upsertRequirementSet(entry, requirements);
    return { requirementSet, requirementsCount: requirements.length, source: entry };
  } catch (error) {
    console.error(`Failed to fetch regulation ${catalogId}:`, error.message);

    // Even if the fetch fails we still ensure a requirement set exists so the user can track the failure.
    const requirementSet = await upsertRequirementSet(entry, [], { error: error.message });
    return { requirementSet, requirementsCount: 0, source: entry, error: error.message };
  }
}

async function ensureRegulationSets(catalogIds = []) {
  const results = [];
  for (const catalogId of catalogIds) {
    const existing = await query(
      "SELECT * FROM requirement_sets WHERE metadata ->> 'catalog_id' = $1 LIMIT 1",
      [catalogId]
    );

    if (existing.rows.length) {
      results.push(existing.rows[0]);
      continue;
    }

    const { requirementSet } = await fetchRegulation(catalogId);
    results.push(requirementSet);
  }
  return results;
}

function getRegulatoryCatalog() {
  return loadCatalog();
}

module.exports = {
  getRegulatoryCatalog,
  fetchRegulation,
  ensureRegulationSets
};
