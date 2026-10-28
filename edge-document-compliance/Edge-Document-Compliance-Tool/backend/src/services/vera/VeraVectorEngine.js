/**
 * Vera Vector Engine
 * Rule-based similarity engine - completely independent, no OpenAI dependencies
 */

import { queryPostgres, queryEdcatAI } from '../../config/databases.js';

const STOPWORDS = new Set([
  'the','and','for','with','that','this','from','into','onto','shall',
  'will','must','can','may','not','are','is','was','were','be','to',
  'of','in','on','by','as','at','or','an','a'
]);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\.]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

function jaccardSimilarity(tokensA, tokensB) {
  if (!tokensA.length || !tokensB.length) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

function getClausePrefix(clauseNumber) {
  if (!clauseNumber) return null;
  const parts = String(clauseNumber).split('.');
  if (parts.length <= 1) return clauseNumber;
  return `${parts[0]}.${parts[1]}`;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

const VeraVectorEngine = {
  async embedAllRequirements(standardId) {
    console.log('[VeraVectorEngine] OpenAI-free mode: embedAllRequirements is a no-op.');
    try {
      // NOTE: parsed_requirements is in Customer Data DB (public.*), use queryPostgres
      await queryPostgres(
        `UPDATE public.parsed_requirements
         SET indexed_for_similarity = TRUE
         WHERE standard_id = $1`,
        [standardId]
      ).catch(() => {});
    } catch (error) {
      console.warn('[VeraVectorEngine] embedAllRequirements bookkeeping failed:', error.message);
    }
    return { embedded: 0, skipped: true, mode: 'rule_based' };
  },

  async findSimilarRequirements(standardId) {
    console.log('[VeraVectorEngine] OpenAI-free mode: rule-based similarity.');
    try {
      // NOTE: parsed_requirements is in Customer Data DB (public.*), use queryPostgres
      const result = await queryPostgres(
        `SELECT id, clause_number, requirement_text
         FROM public.parsed_requirements
         WHERE standard_id = $1`,
        [standardId]
      );
      const requirements = result.rows || [];
      const similaritiesByRequirement = {};

      for (let i = 0; i < requirements.length; i++) {
        const base = requirements[i];
        const baseTokens = tokenize(base.requirement_text);
        const baseClausePrefix = getClausePrefix(base.clause_number);
        const scores = [];

        for (let j = 0; j < requirements.length; j++) {
          if (i === j) continue;
          const other = requirements[j];
          const otherTokens = tokenize(other.requirement_text);
          const otherClausePrefix = getClausePrefix(other.clause_number);

          const clauseScore = baseClausePrefix && otherClausePrefix &&
            baseClausePrefix === otherClausePrefix ? 0.4 : 0;

          const keywordScore = jaccardSimilarity(baseTokens, otherTokens);
          const totalScore = clauseScore + 0.6 * keywordScore;

          if (totalScore > 0) {
            scores.push({
              requirement_id: other.id,
              similarity: round2(totalScore)
            });
          }
        }

        scores.sort((a, b) => b.similarity - a.similarity);
        similaritiesByRequirement[base.id] = scores.slice(0, 5);
      }

      return similaritiesByRequirement;
    } catch (error) {
      console.error('[VeraVectorEngine] Error in findSimilarRequirements:', error.message);
      return {};
    }
  },

  async findSemanticallyRelated(requirementText, limit = 5) {
    console.log('[VeraVectorEngine] OpenAI-free mode: text similarity for procedures.');
    try {
      const result = await queryEdcatAI(
        `SELECT procedure_id, procedure_text
         FROM edcat.procedure_embeddings
         WHERE procedure_text IS NOT NULL
         LIMIT 1000`
      );

      const baseTokens = tokenize(requirementText);
      const scores = [];

      for (const row of result.rows) {
        const procTokens = tokenize(row.procedure_text || '');
        const score = jaccardSimilarity(baseTokens, procTokens);
        if (score > 0) {
          scores.push({
            procedure_id: row.procedure_id,
            procedure_text: row.procedure_text,
            similarity: round2(score)
          });
        }
      }

      scores.sort((a, b) => b.similarity - a.similarity);
      return scores.slice(0, limit);
    } catch (error) {
      console.error('[VeraVectorEngine] Error in findSemanticallyRelated:', error.message);
      return [];
    }
  }
};

export default VeraVectorEngine;

