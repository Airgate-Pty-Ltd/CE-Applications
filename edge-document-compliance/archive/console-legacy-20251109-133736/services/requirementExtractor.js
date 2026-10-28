const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;

/**
 * Extract requirements from parsed standard text
 * @param {Object} parsedContent - Parsed content from PDF/DOCX parser
 * @param {string} standardId - Standard identifier
 * @returns {Array<Object>} Extracted requirements
 */
function extractRequirements(parsedContent, standardId) {
  const requirements = [];

  // Requirement indicator keywords
  const mandatoryKeywords = ['shall', 'must', 'will', 'required'];
  const conditionalKeywords = ['should', 'may', 'recommended'];
  const allKeywords = [...mandatoryKeywords, ...conditionalKeywords];

  // Process clauses if available
  if (parsedContent.clauses && parsedContent.clauses.length > 0) {
    parsedContent.clauses.forEach((clause) => {
      const sentences = clause.text.match(/[^.!?]+[.!?]+/g) || [clause.text];

      sentences.forEach((sentence, index) => {
        const lowerSentence = sentence.toLowerCase();

        // Check if sentence contains requirement keywords
        const hasRequirementKeyword = allKeywords.some(keyword =>
          lowerSentence.includes(keyword)
        );

        if (hasRequirementKeyword) {
          const isMandatory = mandatoryKeywords.some(keyword =>
            lowerSentence.includes(keyword)
          );

          const keywords = extractKeywords(sentence);

          requirements.push({
            requirement_id: `${standardId}-${clause.number}-${index + 1}`,
            clause: clause.number,
            requirement_text: sentence.trim(),
            requirement_type: isMandatory ? 'MANDATORY' : 'CONDITIONAL',
            mandatory: isMandatory,
            category: determineCategory(sentence, clause.number),
            keywords: keywords
          });
        }
      });
    });
  } else {
    // Fallback: process raw lines
    const lines = parsedContent.rawLines || parsedContent.text.split('\n');
    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase();

      const hasRequirementKeyword = allKeywords.some(keyword =>
        lowerLine.includes(keyword)
      );

      if (hasRequirementKeyword && line.length > 20) {
        const isMandatory = mandatoryKeywords.some(keyword =>
          lowerLine.includes(keyword)
        );

        const keywords = extractKeywords(line);

        requirements.push({
          requirement_id: `${standardId}-REQ-${index + 1}`,
          clause: 'N/A',
          requirement_text: line.trim(),
          requirement_type: isMandatory ? 'MANDATORY' : 'CONDITIONAL',
          mandatory: isMandatory,
          category: determineCategory(line),
          keywords: keywords
        });
      }
    });
  }

  return requirements;
}

/**
 * Extract significant keywords from text using TF-IDF
 * @param {string} text - Text to extract keywords from
 * @returns {Array<string>} Extracted keywords
 */
function extractKeywords(text) {
  const tokens = tokenizer.tokenize(text.toLowerCase());

  // Remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'shall', 'must', 'will', 'should', 'may',
    'be', 'is', 'are', 'was', 'were', 'been', 'have', 'has', 'had'
  ]);

  const filtered = tokens.filter(token =>
    token.length > 3 && !stopWords.has(token) && /^[a-z]+$/.test(token)
  );

  // Get unique keywords
  return [...new Set(filtered)].slice(0, 10);
}

/**
 * Determine requirement category based on content
 * @param {string} text - Requirement text
 * @param {string} clause - Clause number
 * @returns {string} Category
 */
function determineCategory(text, clause = '') {
  const lowerText = text.toLowerCase();

  // Category keywords
  const categories = {
    'Quality Management': ['quality', 'management', 'system', 'policy', 'objective'],
    'Documentation': ['document', 'record', 'procedure', 'information', 'retain'],
    'Production': ['production', 'manufacturing', 'process', 'control', 'verification'],
    'Maintenance': ['maintenance', 'repair', 'service', 'inspection', 'calibration'],
    'Training': ['training', 'competence', 'qualification', 'personnel', 'awareness'],
    'Design': ['design', 'development', 'verification', 'validation', 'review'],
    'Resource Management': ['resource', 'infrastructure', 'environment', 'equipment'],
    'Monitoring': ['monitoring', 'measurement', 'audit', 'analysis', 'assessment'],
    'Improvement': ['improvement', 'corrective', 'preventive', 'action', 'nonconformity']
  };

  // Check clause-based categories
  if (clause.startsWith('4.')) return 'Quality Management System';
  if (clause.startsWith('5.')) return 'Leadership';
  if (clause.startsWith('6.')) return 'Planning';
  if (clause.startsWith('7.')) return 'Support';
  if (clause.startsWith('8.')) return 'Operation';
  if (clause.startsWith('9.')) return 'Performance Evaluation';
  if (clause.startsWith('10.')) return 'Improvement';

  // Check content-based categories
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return category;
    }
  }

  return 'General';
}

/**
 * Calculate text similarity using Jaro-Winkler distance
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {number} Similarity score (0-1)
 */
function calculateSimilarity(text1, text2) {
  return natural.JaroWinklerDistance(text1.toLowerCase(), text2.toLowerCase());
}

/**
 * Find matching requirements for document text using NLP
 * @param {string} documentText - Document content
 * @param {Array<Object>} requirements - List of requirements
 * @returns {Array<Object>} Matching requirements with scores
 */
function findMatchingRequirements(documentText, requirements) {
  const matches = [];
  const tfidf = new TfIdf();

  // Add document and all requirements to TF-IDF
  tfidf.addDocument(documentText.toLowerCase());
  requirements.forEach(req => {
    tfidf.addDocument(req.requirement_text.toLowerCase());
  });

  requirements.forEach((req, index) => {
    // Calculate TF-IDF based similarity
    const terms = tokenizer.tokenize(req.requirement_text.toLowerCase());
    let score = 0;

    terms.forEach(term => {
      score += tfidf.tfidf(term, 0); // Check term importance in document
    });

    // Normalize score
    const normalizedScore = Math.min(score / terms.length * 10, 1);

    // Also check for direct keyword matches
    const keywordMatches = req.keywords.filter(keyword =>
      documentText.toLowerCase().includes(keyword)
    ).length;

    const keywordScore = keywordMatches / Math.max(req.keywords.length, 1);

    // Combined score (weighted average)
    const combinedScore = (normalizedScore * 0.6 + keywordScore * 0.4);

    if (combinedScore > 0.2) { // Threshold for relevance
      matches.push({
        requirement_id: req.id,
        requirement_text: req.requirement_text,
        clause: req.clause,
        confidence_score: Math.round(combinedScore * 100),
        coverage_score: Math.round(combinedScore * 100),
        keyword_matches: keywordMatches,
        matched_keywords: req.keywords.filter(k => documentText.toLowerCase().includes(k))
      });
    }
  });

  // Sort by confidence score descending
  return matches.sort((a, b) => b.confidence_score - a.confidence_score);
}

module.exports = {
  extractRequirements,
  extractKeywords,
  determineCategory,
  calculateSimilarity,
  findMatchingRequirements
};
