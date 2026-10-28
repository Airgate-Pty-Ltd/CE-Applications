const mammoth = require('mammoth');
const fs = require('fs').promises;

/**
 * Parse DOCX file and extract text content
 * @param {string} filePath - Path to DOCX file
 * @returns {Promise<Object>} Parsed content with text and metadata
 */
async function parseDOCX(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });

    return {
      text: result.value,
      messages: result.messages
    };
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error(`Failed to parse DOCX: ${error.message}`);
  }
}

/**
 * Parse DOCX with HTML conversion for better structure
 * @param {string} filePath - Path to DOCX file
 * @returns {Promise<Object>} Parsed content with HTML
 */
async function parseDOCXWithHTML(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.convertToHtml({ buffer });

    return {
      html: result.value,
      text: result.value.replace(/<[^>]*>/g, ''), // Strip HTML tags
      messages: result.messages
    };
  } catch (error) {
    console.error('DOCX HTML parsing error:', error);
    throw new Error(`Failed to parse DOCX with HTML: ${error.message}`);
  }
}

/**
 * Extract structured content from DOCX with clause detection
 * @param {string} filePath - Path to DOCX file
 * @returns {Promise<Object>} Structured content with detected clauses
 */
async function parseDOCXWithStructure(filePath) {
  const parsed = await parseDOCX(filePath);

  // Split into lines and detect clause patterns
  const lines = parsed.text.split('\n').map(line => line.trim()).filter(Boolean);

  const clauses = [];
  let currentClause = null;
  let currentText = [];

  // Regex patterns for clause detection
  const clausePattern = /^(\d+\.[\d.]*)\s+(.*)/; // Matches: 8.5.1 Title

  for (const line of lines) {
    const clauseMatch = line.match(clausePattern);

    if (clauseMatch) {
      // Save previous clause if exists
      if (currentClause) {
        clauses.push({
          number: currentClause,
          text: currentText.join(' ')
        });
      }

      // Start new clause
      currentClause = clauseMatch[1];
      currentText = [clauseMatch[2] || ''];
    } else if (currentClause) {
      currentText.push(line);
    }
  }

  // Add last clause
  if (currentClause) {
    clauses.push({
      number: currentClause,
      text: currentText.join(' ')
    });
  }

  return {
    ...parsed,
    clauses,
    rawLines: lines
  };
}

module.exports = {
  parseDOCX,
  parseDOCXWithHTML,
  parseDOCXWithStructure
};
