const fs = require('fs').promises;

/**
 * Parse PDF file and extract text content
 * NOTE: PDF parsing temporarily disabled due to library compatibility issues
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<Object>} Parsed content with text and metadata
 */
async function parsePDF(filePath) {
  console.warn('⚠️  PDF parsing temporarily unavailable - returning placeholder');

  // Return a placeholder result
  return {
    text: '[PDF parsing temporarily unavailable. File stored but not processed.]',
    pages: 0,
    info: {},
    metadata: null,
    version: null
  };
}

/**
 * Extract structured content from PDF with clause detection
 * NOTE: PDF parsing temporarily disabled due to library compatibility issues
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<Object>} Structured content with detected clauses
 */
async function parsePDFWithStructure(filePath) {
  const parsed = await parsePDF(filePath);

  return {
    ...parsed,
    clauses: [],
    rawLines: []
  };
}

module.exports = {
  parsePDF,
  parsePDFWithStructure
};
