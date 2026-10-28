/**
 * REBUILT PARSER: Sequential Shall Statement Extraction
 * 
 * Core Logic:
 * 1. Start at Clause 4
 * 2. Find each "shall" statement in order
 * 3. Extract: Clause Number + Paragraph + Full Statement + Complete List
 * 4. Keep lists together (a, b, c, d all in one requirement)
 * 5. Missing list item = GAP in extraction
 * 6. Move to next "shall" statement
 */

import crypto from 'crypto';

class SimpleShallParser {
  constructor(standardCode, standardId, version = '1.0.0') {
    this.standardCode = standardCode;
    this.standardId = standardId;
    this.version = version;
    this.requirements = [];
    this.currentClause = null;
    this.currentParagraph = 1;
  }

  /**
   * Main parse function
   * Input: Full text from standard
   * Output: Array of requirements with clause, paragraph, statement, and lists
   */
  parse(rawText) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📖 PARSER: Sequential Shall Statement Extraction`);
    console.log(`${'='.repeat(80)}\n`);
    
    if (!rawText || rawText.length === 0) {
      console.error('❌ No text provided');
      return [];
    }

    // Clean and normalize the text
    const text = this.normalizeText(rawText);
    console.log(`✅ Text normalized: ${text.length} characters`);

    // Find all shall statements with their context
    this.extractAllShallStatements(text);

    console.log(`\n✅ Extraction complete: Found ${this.requirements.length} requirements\n`);
    console.log(`${'='.repeat(80)}\n`);

    // CRITICAL FIX: Sort requirements by clause number (numerically)
    const sorted = this.sortRequirementsByClause(this.requirements);
    console.log(`✅ Sorted requirements: ${sorted[0]?.clause_number || 'N/A'} → ${sorted[sorted.length - 1]?.clause_number || 'N/A'}\n`);
    
    return sorted;
  }

  /**
   * Clean and normalize text
   */
  normalizeText(text) {
    // Remove extra whitespace but preserve structure
    let normalized = text
      .replace(/\r\n/g, '\n') // Windows line endings
      .replace(/\t/g, '  ')    // Tabs to spaces
      .replace(/\n\s+\n/g, '\n\n'); // Multiple blank lines to double line
    
    return normalized;
  }

  /**
   * Main extraction logic: Find all "shall" statements sequentially
   */
  extractAllShallStatements(text) {
    const lines = text.split('\n');
    
    let clauseNumber = null;
    let paragraphNumber = 1;
    let clauseTitle = null;
    let inScope = false; // Only extract clauses 4-10
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;

      // ================================================================
      // STEP 1: Detect clause headers (e.g., "4.1 Understanding...")
      // ================================================================
      const clauseMatch = line.match(/^(\d+(?:\.\d+)*)\s+([^:]+(?::|$))/);
      
      if (clauseMatch) {
        clauseNumber = clauseMatch[1];
        clauseTitle = clauseMatch[2].trim();
        paragraphNumber = 1;
        
        // Check if in scope (clauses 4-10)
        const topLevel = parseInt(clauseNumber.split('.')[0], 10);
        inScope = topLevel >= 4 && topLevel <= 10;
        
        if (inScope) {
          console.log(`\n📌 [${clauseNumber}] ${clauseTitle}`);
        }
        
        continue;
      }

      // Skip if out of scope
      if (!inScope || !clauseNumber) continue;

      // ================================================================
      // STEP 2: Find "shall" statements
      // ================================================================
      const shallPattern = /\b(shall|must|should|will|is required to|are required to|has to|have to)\b/i;
      
      if (shallPattern.test(line)) {
        // Found a "shall" statement!
        const requirement = this.extractShallStatement(
          lines,
          i,
          clauseNumber,
          paragraphNumber,
          clauseTitle
        );
        
        if (requirement) {
          this.requirements.push(requirement);
          paragraphNumber++; // Increment for next "shall" in this clause
          
          console.log(`   ✓ [${requirement.clause_ref}] P${requirement.paragraph}: "${requirement.statement.substring(0, 80)}..."`);
          
          // If there was a list, show items
          if (requirement.list_items && requirement.list_items.length > 0) {
            console.log(`     └─ List items: ${requirement.list_items.map(item => item.letter).join(', ')}`);
          }
        }
      }
    }
  }

  /**
   * Extract a complete "shall" statement including any following list
   * 
   * Returns:
   * {
   *   clause_ref: "4.1",
   *   clause_title: "Understanding the organization",
   *   paragraph: 1,
   *   statement: "The organization shall...",
   *   list_items: [
   *     { letter: "a", text: "first item" },
   *     { letter: "b", text: "second item" }
   *   ],
   *   full_requirement_text: "The organization shall... a) first item b) second item"
   * }
   */
  extractShallStatement(lines, startLine, clauseNumber, paragraphNumber, clauseTitle) {
    let statementText = lines[startLine].trim();
    let currentLine = startLine + 1;
    let listItems = [];
    let foundCompleteStatement = false;

    // ================================================================
    // STEP 1: Collect the complete statement (might span multiple lines)
    // ================================================================
    while (currentLine < lines.length && !foundCompleteStatement) {
      const nextLine = lines[currentLine].trim();
      
      // Stop if we hit a new clause number
      if (nextLine.match(/^(\d+(?:\.\d+)*)\s+/)) {
        break;
      }

      // Check if line starts a list (has a) or b) etc)
      if (nextLine.match(/^[a-z]\)\s+/)) {
        // Start of list
        const match = nextLine.match(/^([a-z])\)\s+(.*)/);
        if (match) {
          const letter = match[1];
          const itemText = match[2];
          
          listItems.push({
            letter: letter,
            text: itemText,
            full: nextLine
          });
        }
        
        currentLine++;
        continue;
      }

      // If we already collected a list, and this line doesn't look like a list item, we're done
      if (listItems.length > 0 && !nextLine.match(/^[a-z]\)\s+/)) {
        foundCompleteStatement = true;
        break;
      }

      // If no list started and this line is empty or just text, add to statement
      if (!nextLine.match(/^[a-z]\)\s+/) && nextLine.length > 0) {
        statementText += ' ' + nextLine;
      }

      currentLine++;

      // Safety: Stop after collecting reasonable amount of text
      if (statementText.length > 2000) {
        foundCompleteStatement = true;
      }
    }

    // ================================================================
    // STEP 2: Validate and build requirement
    // ================================================================
    if (!statementText || statementText.length < 10) {
      return null; // Invalid requirement
    }

    // Build the full requirement text including list
    let fullRequirementText = statementText.trim();
    
    if (listItems.length > 0) {
      const listText = listItems
        .map(item => `${item.letter}) ${item.text}`)
        .join('; ');
      fullRequirementText += ` [LIST: ${listText}]`;
    }

    // Build clause reference
    const clauseRef = `${clauseNumber}`;
    const clauseFullRef = `${clauseNumber}.P${paragraphNumber}`;

    // Extract top-level clause
    const topLevelClause = clauseNumber.split('.')[0];
    
    // Map to standardized format expected by storage layer
    return {
      // Standardized format fields
      clause: topLevelClause,
      clause_name: this.getClauseName(topLevelClause),
      subclause: clauseNumber,
      subclause_name: clauseTitle,
      paragraph: `P${paragraphNumber}`,
      requirement: fullRequirementText.trim(),
      requirement_text: fullRequirementText.trim(),
      
      // Additional metadata
      statement: statementText.trim(),
      list_items: listItems,
      has_list: listItems.length > 0,
      list_complete: this.isListComplete(listItems),
      
      // Identifiers
      requirement_uid: this.generateUID(clauseFullRef, fullRequirementText),
      standard_id: this.standardId,
      standard_code: this.standardCode,
      
      // Clause info (for backward compatibility)
      clause_number: clauseNumber,
      clause_ref: clauseRef,
      clause_title: clauseTitle,
      paragraph_number: paragraphNumber,
      
      // Metadata
      keyword: 'shall',
      confidence: this.calculateConfidence(statementText, listItems),
      extracted_at: new Date(),
      extracted_by_model_version: this.version,
      
      // For GAP analysis
      is_in_scope: true,
      is_informative_note: false
    };
  }

  /**
   * Get clause name from top-level clause number
   */
  getClauseName(topLevelClause) {
    const clauseNames = {
      '4': 'Context of the organization',
      '5': 'Leadership',
      '6': 'Planning',
      '7': 'Support',
      '8': 'Operation',
      '9': 'Performance Evaluation',
      '10': 'Improvement'
    };
    
    return clauseNames[topLevelClause] || 'General';
  }

  /**
   * Sort requirements numerically by clause number
   * 4.1 → 4.2 → 4.3 → 4.4.1 → 4.4.2 → 5.1 etc.
   */
  sortRequirementsByClause(requirements) {
    return requirements.sort((a, b) => {
      // Parse clause numbers: "4.2" → [4, 2], "4.4.1" → [4, 4, 1]
      const aParts = (a.clause_number || a.subclause || '0').split('.').map(x => parseInt(x, 10) || 0);
      const bParts = (b.clause_number || b.subclause || '0').split('.').map(x => parseInt(x, 10) || 0);

      // Compare each part numerically
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        
        if (aVal !== bVal) {
          return aVal - bVal; // Numeric comparison (4 < 5)
        }
      }

      // Same clause, compare by paragraph number
      const aPara = parseInt((a.paragraph || a.paragraph_number || 'P1').replace('P', ''), 10) || 1;
      const bPara = parseInt((b.paragraph || b.paragraph_number || 'P1').replace('P', ''), 10) || 1;
      return aPara - bPara;
    });
  }

  /**
   * Check if a list is complete (has consecutive letters a, b, c, etc with no gaps)
   */
  isListComplete(listItems) {
    if (listItems.length === 0) return true; // No list = complete
    
    // Get all letters
    const letters = listItems.map(item => item.letter);
    
    // Check for consecutive sequence starting from 'a'
    for (let i = 0; i < letters.length; i++) {
      const expectedLetter = String.fromCharCode('a'.charCodeAt(0) + i);
      if (letters[i] !== expectedLetter) {
        return false; // Gap found (e.g., a, b, d instead of a, b, c)
      }
    }
    
    return true;
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(statementText, listItems) {
    let confidence = 0.85; // Base confidence
    
    // Higher if has obligation keyword
    if (/\bshall\b/i.test(statementText)) confidence += 0.10;
    
    // Slightly higher if has list
    if (listItems.length > 0) confidence += 0.05;
    
    // Cap at 0.99
    return Math.min(confidence, 0.99);
  }

  /**
   * Generate deterministic UID
   */
  generateUID(ref, text) {
    const combined = `${this.standardId}|${ref}|${text.substring(0, 100)}`;
    return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
  }

  /**
   * Format requirements for display
   */
  formatForDisplay() {
    const output = [];
    output.push(`\n${'='.repeat(80)}`);
    output.push(`EXTRACTED REQUIREMENTS - ${this.standardCode}`);
    output.push(`Total: ${this.requirements.length}`);
    output.push(`${'='.repeat(80)}\n`);

    // Group by clause
    const byClause = {};
    this.requirements.forEach(req => {
      if (!byClause[req.clause_number]) {
        byClause[req.clause_number] = [];
      }
      byClause[req.clause_number].push(req);
    });

    // Display by clause
    Object.keys(byClause).sort((a, b) => {
      const aparts = a.split('.').map(x => parseInt(x, 10));
      const bparts = b.split('.').map(x => parseInt(x, 10));
      
      for (let i = 0; i < Math.max(aparts.length, bparts.length); i++) {
        const aval = aparts[i] || 0;
        const bval = bparts[i] || 0;
        if (aval !== bval) return aval - bval;
      }
      return 0;
    }).forEach(clause => {
      output.push(`\n[${clause}] ${byClause[clause][0].clause_title}`);
      
      byClause[clause].forEach(req => {
        output.push(`  P${req.paragraph_number}: ${req.statement.substring(0, 100)}${req.statement.length > 100 ? '...' : ''}`);
        
        if (req.has_list) {
          const itemStr = req.list_items.map(item => `${item.letter}) ${item.text.substring(0, 50)}`).join(' | ');
          output.push(`    LIST: ${itemStr}`);
          
          if (!req.list_complete) {
            output.push(`    ⚠️  INCOMPLETE LIST: Found ${req.list_items.length} items`);
          }
        }
      });
    });

    return output.join('\n');
  }
}

export default SimpleShallParser;

