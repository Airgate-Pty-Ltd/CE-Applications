/**
 * Vera Document Numbering Response Handler
 * 
 * Handles questions about document numbering and explains that numbering is cosmetic metadata only
 */

export class VeraDocumentNumberingResponse {
  /**
   * Check if message is about document numbering
   * @param {string} messageText
   * @returns {boolean}
   */
  static isNumberingQuestion(messageText) {
    const lower = (messageText || '').toLowerCase();
    const patterns = [
      'document numbering',
      'document number',
      'procedure number',
      'numbering scheme',
      'numbering format',
      'doc number',
      'numbering requirement',
      'numbering standard',
      'inconsistent numbering',
      'missing document number',
      'duplicate document number'
    ];
    return patterns.some(pattern => lower.includes(pattern));
  }

  /**
   * Generate response about document numbering
   * @returns {string}
   */
  static generateResponse() {
    return `**Document Numbering: Cosmetic Metadata Only**

There is no requirement in AS/ISO/FAA/Customer documentation standards to have a specific document numbering scheme. Document numbers (like P-750-01, WI-750-001, etc.) are optional metadata used for organization and traceability convenience.

**What matters for compliance:**
- Document title and content
- Explicit mappings to standard clauses
- Document ID (internal identifier)
- Evidence that requirements are addressed

**What doesn't affect compliance:**
- Document numbering format or pattern
- Whether numbers are consistent across documents
- Whether numbers are missing or duplicated
- Numbering scheme changes over time

I'll help you with content, mapping, and gap analysis rather than focusing on numbering formats. If you have questions about specific clauses or need help mapping procedures to requirements, I'm here to help with that.`;
  }
}

export default VeraDocumentNumberingResponse;

