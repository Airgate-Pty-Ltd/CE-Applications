/**
 * Text Sanitizer
 * Cleans raw extracted text before clause detection and sentence splitting
 * Removes OCR artifacts, hyphenation, headers/footers, and boilerplate
 */

/**
 * Sanitize raw text extracted from PDF/DOCX
 * Fixes hyphenation, removes headers/footers, heals word breaks
 */
export function sanitizeRaw(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    // Unicode normalization
    .normalize('NFKC')
    
    // Remove non-breaking spaces & soft hyphens
    .replace(/\u00A0/g, ' ')
    .replace(/\u00AD/g, '')                 // soft hyphen
    
    // Fix PDF one-dot leaders, stray dots, and spaced punctuation
    .replace(/\u2024/g, '.')                // one-dot leader
    .replace(/(\w)\s+\.\s+/g, '$1. ')
    .replace(/\s+([;:,.\)\]])/g, '$1')      // space before punctuation
    .replace(/([(\[])\s+/g, '$1')           // space after opening bracket
    
    // Heal hyphenation at line breaks: "test-\ncase" -> "testcase"
    .replace(/-\s*\n\s*/g, '')              // word break join
    // Join stray intra-word linebreaks: "D\nelivery" -> "Delivery"
    .replace(/([A-Za-z])\s*\n\s*([a-z])/g, '$1$2')
    
    // Heal accidental mid-word spaces introduced by OCR around capital letters
    .replace(/([A-Za-z])\s+([A-Z][a-z]+)/g, (m, a, b) => {
      // Only join if it looks like a word break (capital after lowercase)
      if (a === a.toLowerCase() && b[0] === b[0].toUpperCase()) {
        return `${a}${b}`;
      }
      return m; // Keep original if not a word break
    })
    
    // Heal dotted abbreviations that split: "e . g ." -> "e.g."
    .replace(/\be\s*\.\s*g\s*\./gi, 'e.g.')
    .replace(/\bi\s*\.\s*e\s*\./gi, 'i.e.')
    .replace(/\bet\s*\.\s*al\s*\./gi, 'et al.')
    .replace(/\bvs\s*\./gi, 'vs.')
    .replace(/\betc\s*\./gi, 'etc.')
    
    // Remove common boilerplate lines entirely (global, multiline)
    .replace(/^\s*Downloaded from SAE.*$/gmi, '')
    .replace(/^\s*SAE INTERNATIONAL AS9100.*$/gmi, '')
    .replace(/^\s*Page\s+\d+\s+of\s+\d+\s*$/gmi, '')
    .replace(/^\s*SAE INTERNATIONAL.*$/gmi, '')
    .replace(/^\s*AS9100.*Page\s+\d+.*$/gmi, '')
    
    // Remove isolated column artifacts like hyphen-only lines
    .replace(/^\s*-\s*$/gm, '')
    .replace(/^\s*_{3,}\s*$/gm, '')  // Underscore lines
    .replace(/^\s*={3,}\s*$/gm, '')  // Equal sign lines
    
    // Collapse multiple newlines and spaces
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Normalize text for deterministic ID generation
 * Lowercase, collapse spaces, strip minimal punctuation
 */
export function normalizeForId(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[ \t\n]+/g, ' ')  // Collapse whitespace
    .replace(/[^\w\s]/g, '')    // Remove punctuation
    .trim();
}

