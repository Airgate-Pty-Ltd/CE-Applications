/**
 * Parse Service
 * Extracts clauses from standards using TextExtractor and clause-aware parsing
 */

import { query } from '../database/connection.js';
import TextExtractor from './textExtractor.js';

class ParseService {
  constructor() {
    this.textExtractor = new TextExtractor();
  }

  /**
   * Parse a standard document and extract clauses
   * @param {string} filePath - Path to standard document
   * @param {Object} standard - Standard record {id, code, name, authority_source}
   * @returns {Promise<Object>} {success, clausesExtracted, standard}
   */
  async parseStandard(filePath, standard) {
    console.log(`[PARSE] Parsing ${standard.code} from ${filePath}`);

    try {
      // Extract text
      const content = await this.textExtractor.extractFromFile(filePath);
      if (!content || content.trim().length === 0) {
        throw new Error('No text extracted from file');
      }

      console.log(`[PARSE] Extracted ${content.length} characters`);

      // Parse based on standard type
      let clauses = [];

      if (standard.code.includes('ISO')) {
        clauses = this.parseISO(content, standard);
      } else if (standard.code.includes('AS9100') || standard.code.includes('AS9110')) {
        clauses = this.parseAS(content, standard);
      } else if (standard.code.includes('FAA') || standard.code.includes('Part')) {
        clauses = this.parseFAA(content, standard);
      } else if (standard.code.includes('EASA')) {
        clauses = this.parseEASA(content, standard);
      } else {
        clauses = this.parseGeneric(content, standard);
      }

      console.log(`[PARSE] Extracted ${clauses.length} clauses`);

      // Save to database - FIXED: Use parsed_requirements table (not parsed_clauses)
      let savedCount = 0;
      for (const requirement of clauses) {
        try {
          // Extract structured fields
          const clause = requirement.clause || requirement.number?.split('.')[0] || 'N/A';
          const subclause = requirement.subclause || requirement.number || 'N/A';
          const paragraph = requirement.paragraph || 'P1';
          const requirementText = requirement.text || requirement.requirement || '';
          const keyword = requirement.keyword || this.extractKeyword(requirementText);
          
          await query(
            `INSERT INTO parsed_requirements 
             (standard_id, clause_number, subclause, paragraph,
              requirement_text, requirement_type, keyword, confidence,
              extracted_by, model_version_used, clause_title, intent, common_gaps)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (standard_id, subclause, paragraph)
             DO UPDATE SET
               requirement_text = EXCLUDED.requirement_text,
               confidence = EXCLUDED.confidence,
               clause_title = EXCLUDED.clause_title,
               extracted_at = NOW()`,
            [
              standard.id,
              clause,
              subclause,
              paragraph,
              requirementText,
              requirement.type || 'General',
              keyword,
              requirement.confidence || 0.75,
              'system',
              '1.0.0',
              requirement.title || requirement.subclause_name || 'Untitled',
              requirement.intent || null,
              requirement.commonGaps || null
            ]
          );
          savedCount++;
        } catch (err) {
          console.error(`[PARSE] Error saving requirement ${requirement.subclause || requirement.number}_${requirement.paragraph || 'P1'}:`, err.message);
        }
      }

      // Update standard metadata - FIXED: Use public.standards table
      await query(
        'UPDATE public.standards SET total_clauses = $1, total_requirements = $1, updated_at = NOW() WHERE id = $2',
        [savedCount, standard.id]
      );

      // Record learning event
      try {
        await query(
          `INSERT INTO edcat_learning_events 
           (event_type, standard_id, source_data, ai_decision, model_version_at_time)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            'clause_parsed',
            standard.id,
            JSON.stringify({ code: standard.code, clauses: savedCount }),
            JSON.stringify({ extracted: savedCount, avg_confidence: 0.75 }),
            '1.0.0'
          ]
        );
      } catch (err) {
        console.warn('[PARSE] Could not record learning event:', err.message);
      }

      return {
        success: true,
        clausesExtracted: savedCount,
        standard: standard.code
      };
    } catch (error) {
      console.error(`[PARSE] Error:`, error.message);
      throw error;
    }
  }

  parseISO(content, standard) {
    const requirements = [];

    // Clause mapping for clause names
    const clauseNames = {
      '4': 'Context of the organization',
      '5': 'Leadership',
      '6': 'Planning',
      '7': 'Support',
      '8': 'Operation',
      '9': 'Performance Evaluation',
      '10': 'Improvement'
    };

    // Split by clause headers using a lookahead pattern
    // This avoids the exec() loop corruption issue
    // Pattern: Start of line + number(s) with dots + TAB
    // Use split with lookahead to preserve the delimiter position
    const clauseParts = content.split(/(?=^\d+(?:\.\d+)*\t)/m);

    console.log(`[PARSE] Split content into ${clauseParts.length} potential clause sections`);

    for (const part of clauseParts) {
      if (!part.trim()) continue;

      // Find the header in this part (number + tab + title)
      const headerMatch = part.match(/^(\d+(?:\.\d+)*)\t(.+?)$/m);
      if (!headerMatch) {
        // Try space separator as fallback
        const headerMatchSpace = part.match(/^(\d+(?:\.\d+)*)\s+(.+?)$/m);
        if (!headerMatchSpace) continue;
        
        // Use space-separated match
        const clauseNumber = headerMatchSpace[1];
        const clauseTitle = headerMatchSpace[2].trim();
        
        // Extract metadata
        const clauseParts_arr = clauseNumber.split('.');
        const topClause = clauseParts_arr[0];
        const clauseName = clauseNames[topClause] || 'General';
        
        // Skip clauses 1-3 (out of scope)
        const topClauseNum = parseInt(topClause, 10);
        if (topClauseNum < 4 || topClauseNum > 10) {
          continue;
        }
        
        // Get text after the header
        const headerEndIndex = headerMatchSpace.index + headerMatchSpace[0].length;
        let clauseText = part.substring(headerEndIndex).trim();
        
        // Split into paragraphs by 2+ blank lines
        const paragraphBlocks = clauseText.split(/\n\n+/);
        let paragraphNum = 1;
        let clauseRequirementCount = 0;
        
        // DIAGNOSTIC: Log paragraph extraction
        console.log(`[PARSE] Clause ${clauseNumber} (${clauseTitle}):`);
        console.log(`   Found ${paragraphBlocks.length} paragraph blocks from clause text`);
        
        for (const block of paragraphBlocks) {
          const blockTrimmed = block.trim();
          
          // Skip empty blocks only
          if (!blockTrimmed) {
            continue;
          }
          
          // KEY FIX: Check if this block contains a requirement keyword
          // This is the TRUE indicator of whether it's a requirement, not NOTE/EXAMPLE status
          const hasRequirementKeyword = /\b(shall|must|should|will|must not|shall not|is required to|have to|has to|are to|is to)\b/i.test(blockTrimmed);
          
          // If NO requirement keywords found, skip this block (it's explanatory)
          if (!hasRequirementKeyword) {
            continue;
          }
          
          // Clean and validate length
          const cleanedText = this.cleanText(blockTrimmed);
          if (cleanedText.length < 20) continue;
          
          // Calculate confidence (using new structured method)
          const confidence = this.calculateConfidenceStructured(cleanedText);
          
          // Extract keyword
          const keyword = this.extractKeyword(cleanedText);
          
          // Determine if sub_paragraph should be included (only for X.Y.Z+ levels)
          const hasSubParagraph = clauseParts_arr.length > 2;
          const subParagraph = hasSubParagraph ? `${clauseNumber} ${clauseTitle}`.trim() : null;
          
          // DIAGNOSTIC: Log which paragraphs are identified as requirements
          if (clauseRequirementCount < 3) { // Only log first few to avoid spam
            console.log(`   P${paragraphNum}: ✓ REQUIREMENT - "${cleanedText.substring(0, 60)}..."`);
          }
          
          const requirement = {
            // NEW FIELDS for structured format
            clause: topClause,
            clause_name: clauseName,
            subclause: clauseNumber,
            subclause_name: clauseTitle,
            paragraph: `P${paragraphNum}`,
            
            // Text variants
            text: cleanedText,
            requirement: cleanedText,
            requirement_text: cleanedText,
            
            // Keywords and confidence
            keyword: keyword,
            confidence: confidence,
            
            // Metadata
            type: 'Requirement',
            intent: this.generateIntent(cleanedText, standard.code),
            commonGaps: this.identifyCommonGaps(cleanedText),
            sub_paragraph: subParagraph,
            title: clauseTitle
          };
          
          requirements.push(requirement);
          paragraphNum++;
          clauseRequirementCount++;
        }
        
        // Log clause summary
        if (clauseRequirementCount > 0) {
          console.log(`   ✓ Clause ${clauseNumber}: Generated ${clauseRequirementCount} requirements`);
        } else {
          console.log(`   ⚠️  Clause ${clauseNumber}: No requirements found (no 'shall' statements)`);
        }
      } else {
        // Handle tab-separated format (primary format)
        const clauseNumber = headerMatch[1];
        const clauseTitle = headerMatch[2].trim();
        
        // Extract metadata
        const clauseParts_arr = clauseNumber.split('.');
        const topClause = clauseParts_arr[0];
        const clauseName = clauseNames[topClause] || 'General';
        
        // Skip clauses 1-3 (out of scope)
        const topClauseNum = parseInt(topClause, 10);
        if (topClauseNum < 4 || topClauseNum > 10) {
          continue;
        }
        
        // Get text after the header
        const headerEndIndex = headerMatch.index + headerMatch[0].length;
        let clauseText = part.substring(headerEndIndex).trim();
        
        // Split into paragraphs by 2+ blank lines
        const paragraphBlocks = clauseText.split(/\n\n+/);
        let paragraphNum = 1;
        let clauseRequirementCount = 0;
        
        // DIAGNOSTIC: Log paragraph extraction
        console.log(`[PARSE] Clause ${clauseNumber} (${clauseTitle}):`);
        console.log(`   Found ${paragraphBlocks.length} paragraph blocks from clause text`);
        
        for (const block of paragraphBlocks) {
          const blockTrimmed = block.trim();
          
          // Skip empty blocks only
          if (!blockTrimmed) {
            continue;
          }
          
          // KEY FIX: Check if this block contains a requirement keyword
          // This is the TRUE indicator of whether it's a requirement, not NOTE/EXAMPLE status
          const hasRequirementKeyword = /\b(shall|must|should|will|must not|shall not|is required to|have to|has to|are to|is to)\b/i.test(blockTrimmed);
          
          // If NO requirement keywords found, skip this block (it's explanatory)
          if (!hasRequirementKeyword) {
            continue;
          }
          
          // Clean and validate length
          const cleanedText = this.cleanText(blockTrimmed);
          if (cleanedText.length < 20) continue;
          
          // Calculate confidence (using new structured method)
          const confidence = this.calculateConfidenceStructured(cleanedText);
          
          // Extract keyword
          const keyword = this.extractKeyword(cleanedText);
          
          // Determine if sub_paragraph should be included (only for X.Y.Z+ levels)
          const hasSubParagraph = clauseParts_arr.length > 2;
          const subParagraph = hasSubParagraph ? `${clauseNumber} ${clauseTitle}`.trim() : null;
          
          // DIAGNOSTIC: Log which paragraphs are identified as requirements
          if (clauseRequirementCount < 3) { // Only log first few to avoid spam
            console.log(`   P${paragraphNum}: ✓ REQUIREMENT - "${cleanedText.substring(0, 60)}..."`);
          }
          
          const requirement = {
            // NEW FIELDS for structured format
            clause: topClause,
            clause_name: clauseName,
            subclause: clauseNumber,
            subclause_name: clauseTitle,
            paragraph: `P${paragraphNum}`,
            
            // Text variants
            text: cleanedText,
            requirement: cleanedText,
            requirement_text: cleanedText,
            
            // Keywords and confidence
            keyword: keyword,
            confidence: confidence,
            
            // Metadata
            type: 'Requirement',
            intent: this.generateIntent(cleanedText, standard.code),
            commonGaps: this.identifyCommonGaps(cleanedText),
            sub_paragraph: subParagraph,
            title: clauseTitle
          };
          
          requirements.push(requirement);
          paragraphNum++;
          clauseRequirementCount++;
        }
        
        // Log clause summary
        if (clauseRequirementCount > 0) {
          console.log(`   ✓ Clause ${clauseNumber}: Generated ${clauseRequirementCount} requirements`);
        } else {
          console.log(`   ⚠️  Clause ${clauseNumber}: No requirements found (no 'shall' statements)`);
        }
      }
    }

    console.log(`[PARSE] Extracted ${requirements.length} requirement(s) from ISO standard`);
    
    // CRITICAL: Sort requirements before returning
    const sorted = requirements.sort((a, b) => {
      const aRef = (a.number || a.subclause || a.clause_number || a.reference || '').toString();
      const bRef = (b.number || b.subclause || b.clause_number || b.reference || '').toString();
      
      // Parse as numeric components if they contain dots
      if (aRef.includes('.') && bRef.includes('.')) {
        const aParts = aRef.split('.').map(x => parseInt(x, 10) || 0);
        const bParts = bRef.split('.').map(x => parseInt(x, 10) || 0);
        
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          if ((aParts[i] || 0) !== (bParts[i] || 0)) {
            return (aParts[i] || 0) - (bParts[i] || 0);
          }
        }
      }
      
      return aRef.localeCompare(bRef);
    });
    
    if (sorted.length > 0) {
      console.log(`[PARSESERVICE] Sorted ${sorted.length} requirements: ${sorted[0].number || sorted[0].reference || sorted[0].clause_number || 'N/A'} → ${sorted[sorted.length-1].number || sorted[sorted.length-1].reference || sorted[sorted.length-1].clause_number || 'N/A'}`);
    }
    
    return sorted;
  }

  /**
   * Split text into paragraphs
   * Paragraphs are separated by 2+ blank lines followed by NON-LIST text
   * List items (a., b., 1., 2.) are kept with their parent paragraph
   */
  splitIntoParagraphs(text) {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Normalize line endings and tabs
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    
    const paragraphs = [];
    let currentParagraph = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
      const prevLine = i > 0 ? lines[i - 1].trim() : '';
      
      // Empty line - potential paragraph break
      if (!line || line.length === 0) {
        // Check if next non-empty line is a list marker
        let nextNonEmpty = '';
        for (let j = i + 1; j < lines.length; j++) {
          const checkLine = lines[j].trim();
          if (checkLine.length > 0) {
            nextNonEmpty = checkLine;
            break;
          }
        }
        
        const isNextLineList = /^\s*([a-z]|\d+)\.\s+/i.test(nextNonEmpty) || 
                              /^\s*[-–—]\s+/.test(nextNonEmpty) ||
                              /^\s*\(([a-z]|\d+)\)\s+/i.test(nextNonEmpty);
        
        // If we have multiple blank lines AND next line is NOT a list marker, start new paragraph
        if (prevLine && nextNonEmpty && !isNextLineList && currentParagraph.length > 0) {
          // Check if we had blank lines before this
          let blankLineCount = 0;
          for (let j = i; j >= 0 && j > i - 3; j--) {
            if (!lines[j].trim()) blankLineCount++;
            else break;
          }
          
          if (blankLineCount >= 1) {
            // Finalize current paragraph
            const paraText = currentParagraph.join(' ').trim();
            if (paraText.length > 0) {
              paragraphs.push(paraText);
            }
            currentParagraph = [];
            inList = false;
            continue;
          }
        }
        
        // Single blank line - continue current paragraph (might be list continuation)
        continue;
      }
      
      // Check if this line is a list marker
      const isListMarker = /^\s*([a-z]|\d+)\.\s+/i.test(line) || 
                          /^\s*[-–—]\s+/.test(line) ||
                          /^\s*\(([a-z]|\d+)\)\s+/i.test(line);
      
      if (isListMarker) {
        inList = true;
        currentParagraph.push(line);
      } else if (inList && line.length > 0) {
        // Continuation of list item (wrapped text)
        if (currentParagraph.length > 0) {
          currentParagraph[currentParagraph.length - 1] += ' ' + line;
        } else {
          currentParagraph.push(line);
        }
      } else {
        // Non-list text
        if (inList && currentParagraph.length > 0) {
          // List ended, this is continuation of parent paragraph
          currentParagraph.push(line);
          inList = false;
        } else if (!inList && currentParagraph.length > 0 && prevLine && !prevLine.trim()) {
          // New paragraph after blank line
          const paraText = currentParagraph.join(' ').trim();
          if (paraText.length > 0) {
            paragraphs.push(paraText);
          }
          currentParagraph = [line];
        } else {
          // Continue current paragraph
          currentParagraph.push(line);
        }
      }
    }
    
    // Don't forget the last paragraph
    if (currentParagraph.length > 0) {
      const paraText = currentParagraph.join(' ').trim();
      if (paraText.length > 0) {
        paragraphs.push(paraText);
      }
    }

    // If no paragraphs were found (single block), return the whole text as one paragraph
    if (paragraphs.length === 0 && text.trim().length > 0) {
      return [text.trim()];
    }

    return paragraphs;
  }

  /**
   * Check if text is likely a requirement even without explicit keywords
   */
  isLikelyRequirement(text) {
    const lower = text.toLowerCase();
    
    // Check for requirement-like patterns
    const patterns = [
      /\bthe organization\b/i,
      /\bthe company\b/i,
      /\bthe supplier\b/i,
      /\bmanagement\b/i,
      /\bensure\b/i,
      /\bestablish\b/i,
      /\bmaintain\b/i,
      /\bdetermine\b/i,
      /\bprovide\b/i,
      /\bcontrol\b/i,
      /\bmonitor\b/i,
      /\bverify\b/i,
      /\bvalidate\b/i
    ];
    
    return patterns.some(pattern => pattern.test(lower)) && text.length > 30;
  }

  parseAS(content, standard) {
    return this.parseISO(content, standard);
  }

  parseFAA(content, standard) {
    const clauses = [];
    const lines = content.split('\n');
    let currentClause = null;

    for (const line of lines) {
      const clauseMatch = line.match(/^§?\s*(\d+\.\d+(?:\([a-z]\))?)\s+(.+?)$/i);

      if (clauseMatch) {
        if (currentClause && currentClause.text) {
          currentClause.text = currentClause.text.trim();
          currentClause.confidence = this.calculateConfidence(currentClause.text);
          currentClause.intent = this.generateIntent(currentClause.text, standard.code);
          currentClause.commonGaps = this.identifyCommonGaps(currentClause.text);
          clauses.push(currentClause);
        }

        currentClause = {
          number: clauseMatch[1],
          title: clauseMatch[2].trim(),
          text: '',
          type: this.inferType(clauseMatch[2])
        };
      } else if (currentClause) {
        currentClause.text += '\n' + line;
      }
    }

    if (currentClause && currentClause.text) {
      currentClause.text = currentClause.text.trim();
      currentClause.confidence = this.calculateConfidence(currentClause.text);
      currentClause.intent = this.generateIntent(currentClause.text, standard.code);
      currentClause.commonGaps = this.identifyCommonGaps(currentClause.text);
      clauses.push(currentClause);
    }

    return clauses;
  }

  parseEASA(content, standard) {
    return this.parseFAA(content, standard);
  }

  parseGeneric(content, standard) {
    const clauses = [];
    const sentences = content.split(/(?<=[.!?])\s+/);
    let clauseNum = 1;

    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes('shall') && sentence.length > 50) {
        clauses.push({
          number: `${clauseNum}`,
          title: sentence.substring(0, 100).replace(/^.*?(shall|must)/i, '$1'),
          text: sentence.trim(),
          type: 'Requirement',
          confidence: 0.65
        });
        clauseNum++;
      }
    }

    return clauses;
  }

  inferType(text) {
    const lower = text.toLowerCase();
    if (lower.includes('procedure') || lower.includes('process')) return 'Procedure';
    if (lower.includes('record') || lower.includes('document')) return 'Record';
    if (lower.includes('responsibility') || lower.includes('role')) return 'Responsibility';
    if (lower.includes('review') || lower.includes('audit')) return 'Review';
    if (lower.includes('control') || lower.includes('management')) return 'Control';
    return 'General';
  }

  calculateConfidence(text) {
    // Use the new structured confidence calculator
    return this.calculateConfidenceStructured(text);
  }

  /**
   * Calculate confidence with structured keyword detection
   * NEW: Context-aware scoring with different weights for different keywords
   */
  calculateConfidenceStructured(text) {
    let score = 0.60;  // Base score for any requirement
    
    // Mandatory requirement keywords (highest confidence boost)
    if (/\bshall\b/.test(text)) score += 0.15;
    if (/\bmust\b/.test(text)) score += 0.12;
    if (/\bshall not\b/.test(text)) score += 0.15;
    if (/\bmust not\b/.test(text)) score += 0.12;
    
    // Optional keywords (lower confidence boost)
    if (/\bshould\b/.test(text)) score += 0.05;
    if (/\bcould\b/.test(text)) score += 0.03;
    if (/\bmay\b/.test(text)) score += 0.02;
    
    // Format indicators
    if (/^\d+(\.\d+){0,3}/.test(text.trim())) score += 0.08;
    if (/^[a-z]\)/.test(text.trim())) score += 0.05;  // Lettered item like "a)"
    
    // Reduce confidence for guidance/notes (not actual requirements)
    if (/^NOTE|^EXAMPLE|^GUIDANCE|^INFORMATIVE/i.test(text)) score -= 0.20;
    
    // Clamp between 0.30 and 0.98
    return Math.min(Math.max(score, 0.30), 0.98);
  }

  /**
   * Clean text (remove extra whitespace, normalize, heal hyphenation)
   * IMPROVED: Better formatting cleanup
   */
  cleanText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    // Remove multiple consecutive spaces
    text = text.replace(/\s+/g, ' ');
    
    // Remove page number markers
    text = text.replace(/\s*[-–—]\s*\d+\s*(?:—|–|-)\s*/g, ' ');
    
    // Remove line breaks and carriage returns
    text = text.replace(/[\r\f\v]/g, '');
    
    // Heal hyphenation: "require-\nment" becomes "requirement"
    text = text.replace(/(-)\n\s*/g, '');
    
    // Normalize newlines to spaces
    text = text.replace(/\n/g, ' ');
    
    // Remove tabs
    text = text.replace(/\t/g, ' ');
    
    // Final normalization of multiple spaces
    text = text.replace(/\s+/g, ' ');
    
    // Remove leading/trailing spaces
    return text.trim();
  }

  /**
   * Extract requirement keyword (shall, must, should, etc.)
   * NEW: Helper method to identify requirement keywords
   */
  extractKeyword(text) {
    const keywords = ['shall not', 'must not', 'shall', 'must', 'should', 'could', 'may'];
    
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(text)) {
        return kw.toLowerCase();
      }
    }
    
    return null;
  }

  generateIntent(text, standardCode) {
    const patterns = {
      'change': 'Ensure changes are managed and assessed for impact',
      'document': 'Maintain documented procedures and records',
      'manage': 'Establish and maintain processes to control this area',
      'review': 'Periodically assess effectiveness and identify improvements',
      'responsibility': 'Define clear roles and ensure accountability',
      'training': 'Ensure personnel are competent and trained',
      'control': 'Implement measures to prevent non-conformances',
      'quality': 'Maintain consistent quality of products/services',
      'audit': 'Conduct independent assessment of compliance'
    };

    for (const [keyword, intent] of Object.entries(patterns)) {
      if (text.toLowerCase().includes(keyword)) {
        return intent;
      }
    }

    return `This clause requires compliance with the stated requirements for ${standardCode}`;
  }

  identifyCommonGaps(text) {
    const patterns = {
      'change': 'Missing impact assessment or ECN process',
      'document': 'Procedures exist but no evidence of use; records not maintained',
      'responsibility': 'No clear org chart or role definitions',
      'training': 'No training records or staff unaware of requirements',
      'review': 'Reviews not documented or action items not tracked',
      'control': 'Controls documented but not implemented in practice',
      'audit': 'Audits not performed or findings not tracked'
    };

    for (const [keyword, gap] of Object.entries(patterns)) {
      if (text.toLowerCase().includes(keyword)) {
        return gap;
      }
    }

    return 'Organizations often struggle to implement this consistently';
  }
}

export default ParseService;

