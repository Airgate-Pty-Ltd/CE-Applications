/**
 * Requirements Formatter
 * Formats extracted requirements into structured lists similar to:
 * "AS9100 Rev D — Requirements List (All 'Shall' Statements)"
 */

/**
 * Format requirements into a structured hierarchical list
 * @param {Array} requirements - Array of requirement objects with clause, clauseTitle, text
 * @param {Object} options - Formatting options
 * @returns {Object} Formatted requirements structure
 */
export function formatRequirementsList(requirements, options = {}) {
  const {
    standardCode = 'Unknown',
    standardName = 'Unknown',
    standardVersion = '',
    includeOnlyMandatory = true, // Only include "shall" statements
    groupByClause = true
  } = options;

  // Filter to only mandatory requirements if requested
  let filteredRequirements = requirements;
  if (includeOnlyMandatory) {
    filteredRequirements = requirements.filter(req => req.mandatory);
  }

  // Group by clause hierarchy
  const clauseMap = new Map();
  
  for (const req of filteredRequirements) {
    const clause = req.clause || 'Unnumbered';
    const parts = clause.split('.');
    
    // Build hierarchical structure
    let current = clauseMap;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const key = parts.slice(0, i + 1).join('.');
      
      if (!current.has(key)) {
        current.set(key, {
          clauseNumber: key,
          clauseTitle: i === parts.length - 1 ? req.clauseTitle : null,
          requirements: [],
          subClauses: new Map()
        });
      }
      
      const clauseObj = current.get(key);
      if (i === parts.length - 1) {
        // This is the leaf clause - add requirement here
        clauseObj.requirements.push({
          text: req.text,
          confidence: req.confidence,
          keyword: req.keyword
        });
        // Update title if we have one and it's not set
        if (req.clauseTitle && !clauseObj.clauseTitle) {
          clauseObj.clauseTitle = req.clauseTitle;
        }
      } else {
        // Navigate deeper
        current = clauseObj.subClauses;
      }
    }
  }

  // Convert Map to hierarchical array structure
  function mapToArray(map, parentClause = '') {
    const result = [];
    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        if (aVal !== bVal) return aVal - bVal;
      }
      return 0;
    });

    for (const key of sortedKeys) {
      const clauseObj = map.get(key);
      const clauseData = {
        clauseNumber: clauseObj.clauseNumber,
        clauseTitle: clauseObj.clauseTitle,
        requirements: clauseObj.requirements,
        subClauses: mapToArray(clauseObj.subClauses, key)
      };
      result.push(clauseData);
    }
    return result;
  }

  const structured = mapToArray(clauseMap);

  return {
    standard: {
      code: standardCode,
      name: standardName,
      version: standardVersion
    },
    title: `${standardCode}${standardVersion ? ' ' + standardVersion : ''} — Requirements List${includeOnlyMandatory ? ' (All "Shall" Statements)' : ''}`,
    totalRequirements: filteredRequirements.length,
    clauses: structured,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Format requirements as plain text (similar to the example provided)
 * @param {Object} structuredRequirements - Output from formatRequirementsList
 * @returns {string} Formatted text string
 */
export function formatRequirementsAsText(structuredRequirements) {
  const { standard, title, clauses } = structuredRequirements;
  let output = `${title}\n\n`;

  function formatClause(clause, indent = 0) {
    const indentStr = '  '.repeat(indent);
    let result = '';

    // Clause header
    if (clause.clauseNumber !== 'Unnumbered') {
      result += `${indentStr}${clause.clauseNumber}`;
      if (clause.clauseTitle) {
        result += ` ${clause.clauseTitle}`;
      }
      result += '\n\n';
    }

    // Requirements under this clause
    for (const req of clause.requirements) {
      result += `${indentStr}${req.text}\n\n`;
    }

    // Sub-clauses
    for (const subClause of clause.subClauses) {
      result += formatClause(subClause, indent + 1);
    }

    return result;
  }

  for (const clause of clauses) {
    output += formatClause(clause);
  }

  return output;
}

/**
 * Format requirements as markdown
 * @param {Object} structuredRequirements - Output from formatRequirementsList
 * @returns {string} Markdown formatted string
 */
export function formatRequirementsAsMarkdown(structuredRequirements) {
  const { standard, title, clauses } = structuredRequirements;
  let output = `# ${title}\n\n`;
  output += `**Standard:** ${standard.code}${standard.name !== standard.code ? ' - ' + standard.name : ''}\n`;
  output += `**Total Requirements:** ${structuredRequirements.totalRequirements}\n\n`;
  output += `---\n\n`;

  function formatClause(clause, level = 1) {
    let result = '';

    // Clause header
    if (clause.clauseNumber !== 'Unnumbered') {
      const headerPrefix = '#'.repeat(Math.min(level + 1, 6));
      result += `${headerPrefix} ${clause.clauseNumber}`;
      if (clause.clauseTitle) {
        result += ` ${clause.clauseTitle}`;
      }
      result += '\n\n';
    }

    // Requirements under this clause
    for (let i = 0; i < clause.requirements.length; i++) {
      const req = clause.requirements[i];
      result += `${req.text}\n\n`;
    }

    // Sub-clauses
    for (const subClause of clause.subClauses) {
      result += formatClause(subClause, level + 1);
    }

    return result;
  }

  for (const clause of clauses) {
    output += formatClause(clause);
  }

  return output;
}

/**
 * Format requirements as JSON for API responses
 * @param {Object} structuredRequirements - Output from formatRequirementsList
 * @returns {Object} JSON structure
 */
export function formatRequirementsAsJSON(structuredRequirements) {
  return structuredRequirements;
}

export default {
  formatRequirementsList,
  formatRequirementsAsText,
  formatRequirementsAsMarkdown,
  formatRequirementsAsJSON
};

