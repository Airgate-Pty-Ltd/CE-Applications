/**
 * GAP Profile Loader
 * 
 * Loads GAP profile definitions from YAML/JSON files and populates the database.
 * This script seeds the Conform-Edge GAP intelligence library.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import embeddingService from '../services/embeddingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load a GAP profile file (YAML or JSON)
 */
function loadGapProfileFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.yaml' || ext === '.yml') {
    return yaml.load(content);
  } else if (ext === '.json') {
    return JSON.parse(content);
  } else {
    throw new Error(`Unsupported file format: ${ext}`);
  }
}

/**
 * Resolve or create a standard by code
 */
async function resolveStandard(standardCode, version = null) {
  // First, try to find existing standard
  let result = await query(
    `SELECT id FROM standards WHERE code = $1 AND ($2::varchar IS NULL OR version = $2)`,
    [standardCode, version]
  );

  if (result.rows.length > 0) {
    return result.rows[0].id;
  }

  // Try without version
  result = await query(
    `SELECT id FROM standards WHERE code = $1 ORDER BY created_at DESC LIMIT 1`,
    [standardCode]
  );

  if (result.rows.length > 0) {
    return result.rows[0].id;
  }

  // Create new standard
  const standardId = uuidv4();
  await query(
    `INSERT INTO standards (id, name, code, version, source_type, description, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      standardId,
      standardCode, // Use code as name if not provided
      standardCode,
      version,
      'standard',
      `Standard ${standardCode}${version ? ` ${version}` : ''}`,
      true
    ]
  );

  return standardId;
}

/**
 * Resolve or create a clause
 */
async function resolveClause(standardId, clauseRef, title, requirementText, category = null) {
  // Check if clause exists
  let result = await query(
    `SELECT id FROM clauses WHERE standard_id = $1 AND clause_ref = $2`,
    [standardId, clauseRef]
  );

  if (result.rows.length > 0) {
    const clauseId = result.rows[0].id;
    // Update clause if needed
    await query(
      `UPDATE clauses 
       SET title = COALESCE($1, title),
           requirement_text = COALESCE($2, requirement_text),
           category = COALESCE($3, category),
           updated_at = NOW()
       WHERE id = $4`,
      [title, requirementText, category, clauseId]
    );
    return clauseId;
  }

  // Create new clause
  const clauseId = uuidv4();
  await query(
    `INSERT INTO clauses (id, standard_id, clause_ref, title, requirement_text, category, is_mandatory)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      clauseId,
      standardId,
      clauseRef,
      title || null,
      requirementText,
      category || null,
      true
    ]
  );

  return clauseId;
}

/**
 * Load a single GAP profile
 */
async function loadGapProfile(profileData) {
  const {
    standard_code,
    clause_ref,
    version_label = 'v1',
    interpretation,
    expected_evidence,
    expected_documents,
    audit_questions,
    common_pitfalls,
    risk_level,
    criticality_notes,
    tags,
    requirement_text,
    title,
    category
  } = profileData;

  if (!standard_code || !clause_ref || !interpretation || !expected_evidence) {
    throw new Error('Missing required fields: standard_code, clause_ref, interpretation, expected_evidence');
  }

  // 1. Resolve standard
  const standardId = await resolveStandard(standard_code, profileData.version);

  // 2. Resolve or create clause
  const clauseId = await resolveClause(
    standardId,
    clause_ref,
    title,
    requirement_text || interpretation.substring(0, 500), // Use interpretation as fallback
    category
  );

  // 3. Check if gap profile exists
  let result = await query(
    `SELECT id FROM gap_profiles WHERE clause_id = $1 AND version_label = $2`,
    [clauseId, version_label]
  );

  let gapProfileId;
  if (result.rows.length > 0) {
    gapProfileId = result.rows[0].id;
    // Update existing profile
    await query(
      `UPDATE gap_profiles 
       SET interpretation = $1,
           expected_evidence = $2,
           expected_documents = $3,
           audit_questions = $4,
           common_pitfalls = $5,
           risk_level = $6,
           criticality_notes = $7,
           tags = $8,
           updated_at = NOW()
       WHERE id = $9`,
      [
        interpretation,
        expected_evidence,
        expected_documents ? (Array.isArray(expected_documents) ? JSON.stringify(expected_documents) : expected_documents) : null,
        audit_questions ? (Array.isArray(audit_questions) ? JSON.stringify(audit_questions) : audit_questions) : null,
        common_pitfalls || null,
        risk_level || null,
        criticality_notes || null,
        tags ? (Array.isArray(tags) ? JSON.stringify(tags) : tags) : null,
        gapProfileId
      ]
    );
  } else {
    // Create new gap profile
    gapProfileId = uuidv4();
    await query(
      `INSERT INTO gap_profiles 
       (id, clause_id, interpretation, expected_evidence, expected_documents, 
        audit_questions, common_pitfalls, risk_level, criticality_notes, tags, version_label, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        gapProfileId,
        clauseId,
        interpretation,
        expected_evidence,
        expected_documents ? (Array.isArray(expected_documents) ? JSON.stringify(expected_documents) : expected_documents) : null,
        audit_questions ? (Array.isArray(audit_questions) ? JSON.stringify(audit_questions) : audit_questions) : null,
        common_pitfalls || null,
        risk_level || null,
        criticality_notes || null,
        tags ? (Array.isArray(tags) ? JSON.stringify(tags) : tags) : null,
        version_label,
        true
      ]
    );
  }

  // 4. Generate embedding for gap profile
  const embeddingText = `${interpretation}\n\n${expected_evidence}`;
  await embeddingService.generateForGapProfile(gapProfileId, embeddingText);

  return {
    gapProfileId,
    clauseId,
    standardId,
    clauseRef: clause_ref
  };
}

/**
 * Load all GAP profiles from a directory
 */
export async function loadGapProfilesFromDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    console.warn(`[GAP Loader] Directory not found: ${directoryPath}`);
    return { loaded: 0, errors: [] };
  }

  const files = fs.readdirSync(directoryPath);
  const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.json'));
  
  const results = {
    loaded: 0,
    errors: []
  };

  for (const file of yamlFiles) {
    const filePath = path.join(directoryPath, file);
    try {
      console.log(`[GAP Loader] Loading ${file}...`);
      const profileData = loadGapProfileFile(filePath);
      
      // Handle both single profile and array of profiles
      const profiles = Array.isArray(profileData) ? profileData : [profileData];
      
      for (const profile of profiles) {
        const result = await loadGapProfile(profile);
        results.loaded++;
        console.log(`[GAP Loader] ✓ Loaded ${profile.standard_code} ${profile.clause_ref}`);
      }
    } catch (error) {
      console.error(`[GAP Loader] Error loading ${file}:`, error.message);
      results.errors.push({ file, error: error.message });
    }
  }

  return results;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const directoryPath = process.argv[2] || path.join(__dirname, '../data/gap-profiles');
  
  loadGapProfilesFromDirectory(directoryPath)
    .then(results => {
      console.log(`\n[GAP Loader] Complete: ${results.loaded} profiles loaded`);
      if (results.errors.length > 0) {
        console.log(`[GAP Loader] Errors: ${results.errors.length}`);
        results.errors.forEach(({ file, error }) => {
          console.log(`  - ${file}: ${error}`);
        });
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('[GAP Loader] Fatal error:', error);
      process.exit(1);
    });
}

export default {
  loadGapProfile,
  loadGapProfilesFromDirectory
};

