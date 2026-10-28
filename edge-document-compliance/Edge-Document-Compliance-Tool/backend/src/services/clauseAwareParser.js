/**
 * IMPROVED: Clause-Aware Parser for AS9100D and similar standards
 * 
 * Features:
 * - Better clause and title detection
 * - Complete requirement extraction with list items
 * - Clause title preservation
 * - Requirement type classification (MANDATORY/RECOMMENDED/GUIDANCE)
 * - Scope guard (clauses 4-10 only)
 * - Requirement typing and subtyping
 */

import crypto from 'crypto';
import { classifySentence } from './requirementClassifier.js';
import { inRequirementScope } from './requirementClassifier.js';
import { sanitizeRaw, normalizeForId } from './textSanitizer.js';
import { stripNotes } from './noteFilter.js';
import { atomizeList } from './listAtomizer.js';
import {
  extractTopLevelClause,
  shouldIncludeSubParagraph,
  getClauseName,
  getSubclauseName,
  formatSubParagraph,
  calculateStandardizedConfidence,
  cleanRequirementText,
  buildClauseHierarchy,
  createStandardizedRequirement
} from './standardizedFormatExtractor.js';

/**
 * FIND WHERE TABLE OF CONTENTS ENDS
 * TOC in technical standards typically ends when we see actual clause content
 */
const findTOCEndPosition = (text) => {
  if (!text) return 0;
  
  // TOC in technical standards typically ends when:
  // 1. We see "Clause 1" or "1. Introduction" or "1. SCOPE"
  // 2. We see a section that's NOT in TOC format
  // 3. Character position is past ~20,000-30,000 chars
  
  // Strategy: Find the FIRST occurrence of actual clause content
  // Real clauses start with substantial text after the number
  
  // Pattern: "Clause 1:" or "1 " followed by real content (not dots)
  const clausePatterns = [
    /Clause\s+1[\s:]/i,           // "Clause 1:" or "Clause 1 "
    /^1\s+[A-Z][^.]{50,}/m,       // "1 SomethingWithRealText..." (50+ chars, no dots)
    /NORMATIVE REFERENCES/i,      // Section after TOC
    /SCOPE/i,                      // Common first section
    /^1\s+INTRODUCTION/i,          // "1 INTRODUCTION"
    /^1\s+SCOPE/i,                 // "1 SCOPE"
  ];
  
  for (const pattern of clausePatterns) {
    const match = text.match(pattern);
    if (match) {
      const position = match.index;
      console.log(`\n📍 TOC END DETECTED:`);
      console.log(`   Marker: "${text.substring(position, position + 50)}..."`);
      console.log(`   Character position: ${position}`);
      return position;
    }
  }
  
  // Fallback: If no marker found, TOC typically ends by character 20,000-30,000
  // This is safe because content clauses (4, 5, 6, etc.) are always later
  console.log(`\n⚠️  No TOC end marker found, using character position fallback: 25,000`);
  return 25000;
};

/**
 * TOC Detection: Identify Table of Contents entries
 * TOC entries have pattern: "4.1 Title....................page 12"
 */
const isTOCEntry = (content) => {
  if (!content) return false;
  
  // TOC entries have pattern: "4.1 Title....................page 12"
  // They contain: dots followed by page number
  // Characteristics:
  // 1. Contains 3+ consecutive dots
  // 2. Ends with "page" + number
  // 3. Less than 200 characters typically
  // 4. No "shall", "must", "will" verbs
  
  const hasManyDots = /\.{3,}/.test(content);
  const hasPageNumber = /page\s+\d+/i.test(content);
  const hasOtherClauseRef = /^[\d.]+\s+[A-Z]/.test(content.trim());
  const isShort = content.length < 300;
  const hasNoVerbs = !/\b(shall|must|will|should|are required to|is required to|determine|ensure|maintain|establish|provide|implement)\b/i.test(content);
  
  // If it has: many dots + page number + short + no verbs = TOC
  return (hasManyDots && hasPageNumber) || (hasOtherClauseRef && isShort && hasNoVerbs);
};

/**
 * Better TOC content line detection
 * TOC lines have specific pattern: "4.2 Understanding the Needs.....................page 12"
 */
const isTOCContentLine = (text) => {
  if (!text) return false;
  
  // TOC lines have specific pattern:
  // "4.2 Understanding the Needs.....................page 12"
  // Key characteristics:
  // 1. Starts with number/clause reference
  // 2. Has title (20-80 chars typically)
  // 3. Has many consecutive dots (5+)
  // 4. Ends with "page X" or just page number
  
  const trimmed = text.trim();
  
  // Must have the dot pattern
  const hasManyDots = /\.{5,}/.test(text);
  if (!hasManyDots) return false;
  
  // Must end with page reference
  const hasPageNumber = /\s*(\d+)\s*$/.test(trimmed);
  if (!hasPageNumber) return false;
  
  // Must NOT contain requirement keywords
  const hasNoRequirementKeywords = !/\b(shall|must|will|should|are required|determine|ensure|maintain|establish|provide|implement)\b/i.test(text);
  
  return hasPageNumber && hasNoRequirementKeywords;
};

/**
 * Validate clause content looks like actual requirements (not TOC)
 */
const isValidClauseContent = (content, clauseNumber) => {
  if (!content || content.length < 50) return false;
  
  // Should contain requirement keywords
  const hasRequirementKeywords = /\b(shall|must|will|should|is required to|are required to|determine|ensure|maintain|establish|provide|implement|control|monitor|measure|analyze|review|plan|verify|validate)\b/i.test(content);
  
  // Should NOT be mostly dots (TOC pattern)
  const dotRatio = (content.match(/\./g) || []).length / content.length;
  const isNotTOC = dotRatio < 0.15; // Less than 15% dots
  
  // Should NOT look like page number or cross-reference
  const isNotPageRef = !/^(page|see|refer)\s+/i.test(content.trim());
  
  return hasRequirementKeywords && isNotTOC && isNotPageRef;
};

export class ClauseAwareParser {
  constructor(standardCode, standardId, version = '1.0.0') {
    this.standardCode = standardCode;
    this.standardId = standardId; // NEW: Required for deterministic IDs
    this.version = version;
    this.clauses = [];
    this.requirements = [];
    this.standardVersionId = `${standardId}|${version}`; // For deterministic IDs
    this.clauseHierarchy = new Map(); // Track clause hierarchy for standardized format
    this.paragraphCounters = new Map(); // Track paragraph numbering per subclause
  }

  /**
   * Generate deterministic SHA256 ID from standard + full_ref + normalized text
   * This ensures re-parsing produces identical IDs for auditability
   */
  generateRequirementUid(fullRef, normalizedText) {
    const combined = `${this.standardVersionId}|${fullRef}|${normalizedText}`;
    return crypto
      .createHash('sha256')
      .update(combined)
      .digest('hex')
      .substring(0, 16); // Use first 16 hex chars
  }
  
  /**
   * Legacy method for backward compatibility
   */
  generateClauseId(clauseNumber, normalizedText) {
    return this.generateRequirementUid(clauseNumber, normalizedText);
  }

  /**
   * FIXED: Clause detection robust to AS9100D formatting
   * Handles: multi-line clauses, page breaks, headers/footers
   */
  splitByClauses(text) {
    // Step 1: Sanitize raw text (removes headers/footers, heals hyphenation, etc.)
    let normalized = sanitizeRaw(text);
    
    // CRITICAL FIX: Find where TOC ends and only extract clauses after that point
    const tocEndPosition = findTOCEndPosition(normalized);
    console.log(`\n✅ TOC section ends at character ${tocEndPosition}`);
    console.log(`   Will only extract clauses from position ${tocEndPosition} onwards\n`);
    
    // Track extraction statistics
    let tocEntriesSkipped = 0;
    let clausesSkippedBeforeTOCEnd = 0;
    let validClausesExtracted = 0;

    // Step 3: CRITICAL FIX - Merge multi-line clauses
    // Before: "8.7\nControl of Nonconforming\nOutputs"
    // After:  "8.7 Control of Nonconforming Outputs"
    
    // First, identify clause-start lines (digit + period pattern)
    const lines = normalized.split('\n');
    const mergedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line starts with a clause number
      if (line.match(/^\d+(?:\.\d+){0,3}\s+\S/)) {
        // This is a clause header - add it
        mergedLines.push(line);
      } else if (
        line.length > 0 && 
        line.match(/^[A-Z]/) && 
        mergedLines.length > 0 &&
        !line.match(/^\d+(?:\.\d+)/) // Not itself a new clause
      ) {
        // This is a continuation of the previous clause title
        const lastLine = mergedLines[mergedLines.length - 1];
        if (!lastLine.match(/^NOTE|^EXAMPLE|^DERIVED/i)) {
          // Merge with previous line (space-separated)
          mergedLines[mergedLines.length - 1] = lastLine + ' ' + line;
        } else {
          mergedLines.push(line);
        }
      } else if (line.length > 0) {
        mergedLines.push(line);
      }
    }
    
    normalized = mergedLines.join('\n');
    console.log(`✅ Merged multi-line clauses: ${lines.length} → ${mergedLines.length} lines`);

    // Step 4: NOW detect clauses with more tolerant pattern
    // FIXED: Match clauses with OR without titles on the same line
    // Pattern 1: "8 Title" or "8.7 Title" (with title)
    // Pattern 2: "8" or "8.7" (standalone, title might be on next line)
    const clausePatternWithTitle = /^(\d+(?:\.\d+){0,3})\s+([^\n]{3,200})$/gm;
    const clausePatternStandalone = /^(\d+(?:\.\d+){0,3})(?:\s+|$)/gm;
    const matches = [];
    const seenClauses = new Set();
    
    // First, try pattern with title (more specific)
    let match;
    while ((match = clausePatternWithTitle.exec(normalized)) !== null) {
      const clauseNum = match[1].trim();
      const title = match[2].trim();
      
      // Skip false positives - Table of Contents detection
      const dotCount = (title.match(/\./g) || []).length;
      const hasManyPeriods = (title.match(/\.{3,}/g) || []).length > 0;
      const isTOCPattern = title.match(/^[A-Z\s]+\.{10,}/);
      
      if (
        title.match(/^(contents?|table of|index|appendix|footnote|page\s+\d+)/i) ||
        title.match(/^\d+\s*$/) ||
        title.length < 3 ||
        dotCount > 5 ||
        hasManyPeriods ||
        isTOCPattern
      ) {
        console.log(`   ⊘ Skipped: ${clauseNum} (${title.substring(0, 40)})${dotCount > 5 || hasManyPeriods || isTOCPattern ? ' [TOC - too many periods/pattern]' : ''}`);
        continue;
      }
      
      matches.push({
        clauseNumber: clauseNum,
        clauseTitle: title,
        startIndex: match.index,
      });
      seenClauses.add(clauseNum);
    }
    
    // Then, try standalone pattern for clauses without titles on same line
    // This catches clauses like "5" or "10" that might be on their own line
    while ((match = clausePatternStandalone.exec(normalized)) !== null) {
      const clauseNum = match[1].trim();
      
      // Skip if we already found this clause with a title
      if (seenClauses.has(clauseNum)) continue;
      
      // FIXED: Match ALL subclauses, not just top-level or first-level
      // The pattern already supports up to 3 levels (X.Y.Z.W), so we should match all of them
      const parts = clauseNum.split('.');
      const topLevel = parseInt(parts[0], 10);
      
      // Only process clauses in scope (4-10) and their subclauses
      if (topLevel < 4 || topLevel > 10) continue;
      
      // CRITICAL FIX: Skip clauses found before TOC ends
      const clauseStartIndex = match.index;
      if (clauseStartIndex < tocEndPosition) {
        clausesSkippedBeforeTOCEnd++;
        if (clausesSkippedBeforeTOCEnd <= 5) {
          console.log(`⏭️  Skipping clause ${clauseNum} (found at position ${clauseStartIndex}, TOC ends at ${tocEndPosition})`);
        }
        continue; // Skip any clause found before TOC ends
      }
      
      if (validClausesExtracted < 5) {
        console.log(`✅ Clause ${clauseNum} found at position ${clauseStartIndex} (after TOC)`);
      }
      
      // Check if this looks like a clause header (not just a number in text)
      const lineStart = match.index;
      const lineEnd = normalized.indexOf('\n', lineStart);
      const line = normalized.substring(lineStart, lineEnd >= 0 ? lineEnd : normalized.length).trim();
      
      // Must be at start of line or preceded by whitespace
      if (match.index > 0) {
        const charBefore = normalized.substring(Math.max(0, match.index - 1), match.index);
        if (charBefore && !/\s/.test(charBefore) && charBefore !== '\n') {
          continue; // Not at start of line
        }
      }
      
      // Look ahead for title on next line(s)
      let title = `Clause ${clauseNum}`;
      const nextLineStart = lineEnd >= 0 ? lineEnd + 1 : normalized.length;
      const nextLineEnd = normalized.indexOf('\n', nextLineStart);
      const nextLine = normalized.substring(nextLineStart, nextLineEnd >= 0 ? nextLineEnd : normalized.length).trim();
      
      // If next line looks like a title (starts with capital, not a number, reasonable length)
      if (nextLine && 
          nextLine.match(/^[A-Z]/) && 
          !nextLine.match(/^\d/) && 
          nextLine.length > 3 && 
          nextLine.length < 200 &&
          !nextLine.match(/^(Page|Table|Figure|Appendix)/i) &&
          !nextLine.match(/^(\d+\.\d+)/)) { // Don't use next line if it's another clause number
        title = nextLine;
      }
      
      matches.push({
        clauseNumber: clauseNum,
        clauseTitle: title,
        startIndex: match.index,
      });
      seenClauses.add(clauseNum);
    }
    
    // Sort matches by startIndex to maintain order
    matches.sort((a, b) => a.startIndex - b.startIndex);

    console.log(`✅ Found ${matches.length} clause patterns using improved regex`);
    
    if (matches.length === 0) {
      console.warn('⚠️ FALLBACK: No clauses found. This standard may have non-standard formatting.');
      console.warn('   First 200 chars of text:', normalized.substring(0, 200));
      console.warn('   Try running with LOG_LEVEL=debug for more details');
      
      // CRITICAL: Instead of giving up, try aggressive fallback
      return this.tryAggressiveParsing(normalized);
    }

    // Extract content between clause headers
    // FIXED: Better content extraction that handles clauses without titles on same line
    const sections = [];
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];

      let content = '';
      try {
        // Calculate start position: after clause number and title
        // If title was on next line, account for that
        let startPos = current.startIndex + current.clauseNumber.length;
        
        // Check if title is on the same line or next line
        const lineEnd = normalized.indexOf('\n', current.startIndex);
        const currentLine = normalized.substring(current.startIndex, lineEnd >= 0 ? lineEnd : normalized.length);
        
        if (currentLine.includes(current.clauseTitle) && current.clauseTitle !== `Clause ${current.clauseNumber}`) {
          // Title is on same line
          startPos = current.startIndex + current.clauseNumber.length + current.clauseTitle.length + 2;
        } else {
          // Title is on next line or is default - start after the title line
          const titleLineEnd = normalized.indexOf('\n', lineEnd >= 0 ? lineEnd + 1 : current.startIndex);
          startPos = titleLineEnd >= 0 ? titleLineEnd + 1 : (lineEnd >= 0 ? lineEnd + 1 : startPos);
        }
        
        // Extract content up to next clause
        // CRITICAL FIX: Stop at the next clause header to prevent including it in content
        let contentEnd = next ? next.startIndex : normalized.length;
        
        // Additional safety: Look for clause headers in the content and stop there
        // Pattern: Start of line with clause number (e.g., "5.3" or "6.2.1")
        const clauseHeaderPattern = new RegExp(`^\\s*\\d+(?:\\.\\d+){0,3}\\s+[A-Z]`, 'gm');
        const contentSection = normalized.substring(startPos, contentEnd);
        const headerMatch = contentSection.match(clauseHeaderPattern);
        
        if (headerMatch) {
          // Found a clause header in the content - stop before it
          const headerIndex = contentSection.search(clauseHeaderPattern);
          if (headerIndex > 0) {
            contentEnd = startPos + headerIndex;
          }
        }
        
        content = normalized.substring(startPos, contentEnd).trim();
        
        // CRITICAL FIX: Check if content is TOC entry using improved detection
        if (isTOCContentLine(content)) {
          tocEntriesSkipped++;
          if (tocEntriesSkipped <= 5) {
            console.log(`   ❌ SKIPPED: Content is TOC entry, not real clause`);
            console.log(`      Content: "${content.substring(0, 80)}..."`);
          }
          content = ''; // Mark as empty so it gets skipped
        } else if (isTOCEntry(content)) {
          // Fallback to original TOC detection
          tocEntriesSkipped++;
          if (tocEntriesSkipped <= 5) {
            console.log(`   ⚠️  SKIPPED TOC ENTRY for clause ${current.clauseNumber}: "${content.substring(0, 50)}..."`);
          }
          content = ''; // Mark as empty so it gets skipped
        } else {
          validClausesExtracted++;
        }
        
        // OLD CODE REMOVED - was looking ahead for real content, but now we skip TOC upfront
        // CRITICAL FIX: Check if content is TOC entry and skip to find real content
        if (false && isTOCEntry(content)) {
          console.log(`   ⚠️  SKIPPED TOC ENTRY for clause ${current.clauseNumber}: "${content.substring(0, 50)}..."`);
          
          // Look ahead to find real content (skip TOC entries)
          let searchIndex = contentEnd;
          const lookAheadLimit = Math.min(searchIndex + 5000, normalized.length); // Look ahead 5KB
          let foundRealContent = false;
          
          for (let j = searchIndex; j < lookAheadLimit && !foundRealContent; j++) {
            const nextBlock = normalized.substring(j, Math.min(j + 500, normalized.length)).trim();
            
            // Skip if this is another TOC entry
            if (isTOCEntry(nextBlock)) {
              j += 300; // Skip ahead past this TOC entry
              continue;
            }
            
            // Found real content if it has requirement keywords
            if (/\b(shall|must|will|should|are required to|is required to|determine|ensure|maintain|establish|provide|implement)\b/i.test(nextBlock)) {
              // Extract until next clause header or 3KB, whichever comes first
              const remainingText = normalized.substring(j);
              const nextClauseMatch = remainingText.match(/[\n\r]\s*\d+(?:\.\d+){0,3}\s+[A-Z]/);
              const endIndex = nextClauseMatch 
                ? j + nextClauseMatch.index 
                : Math.min(j + 3000, normalized.length);
              
              content = normalized.substring(j, endIndex).trim();
              foundRealContent = true;
              
              console.log(`   ✅ Found real content (not TOC) for clause ${current.clauseNumber} (${content.length} chars)`);
              break;
            }
          }
          
          if (!foundRealContent) {
            console.log(`   ⚠️  No real content found for clause ${current.clauseNumber} (skipped TOC)`);
            content = ''; // Mark as empty so it gets skipped
          }
        }
      } catch (err) {
        console.warn(`⚠️ Error extracting content for ${current.clauseNumber}: ${err.message}`);
        content = ''; // Continue with empty content
      }

      sections.push({
        clauseNumber: current.clauseNumber,
        clauseTitle: current.clauseTitle,
        content: content,
        clauseIndex: i,
      });
    }

    console.log(`✅ Extracted ${sections.length} sections with content`);
    
    // Log extraction summary
    console.log(`\n📊 CLAUSE EXTRACTION SUMMARY:`);
    console.log(`   Total clauses found: ${matches.length}`);
    console.log(`   Skipped (before TOC end): ${clausesSkippedBeforeTOCEnd}`);
    console.log(`   Skipped (TOC content): ${tocEntriesSkipped}`);
    console.log(`   Valid clauses extracted: ${validClausesExtracted}`);
    console.log(`   Sections with content: ${sections.length}`);
    
    return sections;
  }

  /**
   * AGGRESSIVE FALLBACK: Try to find ANY clause-like structure
   */
  tryAggressiveParsing(text) {
    console.log('🔧 Attempting aggressive parsing...');
    
    // Try looser pattern: just numbers with dots, even without following text on same line
    const aggressivePattern = /^(\d+(?:\.\d+){0,3})(?:\s+|$)/gm;
    const matches = [];
    let match;

    while ((match = aggressivePattern.exec(text)) !== null) {
      matches.push({
        clauseNumber: match[1],
        clauseTitle: `Section ${match[1]}`,
        startIndex: match.index,
      });
    }

    console.log(`🔧 Aggressive parsing found ${matches.length} potential clauses`);

    if (matches.length > 0) {
      const sections = [];
      for (let i = 0; i < Math.min(matches.length, 50); i++) {
        const current = matches[i];
        const next = matches[i + 1];
        
        const startPos = current.startIndex + current.clauseNumber.length;
        const content = next
          ? text.substring(startPos, next.startIndex)
          : text.substring(startPos);

        sections.push({
          clauseNumber: current.clauseNumber,
          clauseTitle: `Clause ${current.clauseNumber}`,
          content: content.substring(0, 2000).trim(), // Cap content size
          clauseIndex: i,
        });
      }
      return sections;
    }

    // Ultimate fallback: treat as single document
    console.warn('⚠️ ULTIMATE FALLBACK: Treating entire document as single section');
    return [{
      clauseNumber: '1',
      clauseTitle: 'Full Document',
      content: text,
      clauseIndex: 0,
    }];
  }

  /**
   * IMPROVED: More accurate requirement extraction with scope guard
   */
  parseClauseSection(section) {
    const { clauseNumber, clauseTitle, content } = section;
    
    // SCOPE GUARD: Skip clauses 1-3
    if (!inRequirementScope(clauseNumber)) {
      console.log(`\n⏭️  Skipping clause ${clauseNumber} (out of scope - clauses 1-3 are excluded)`);
      return;
    }
    
    console.log(`\n📖 Clause ${clauseNumber}: ${clauseTitle}`);
    console.log(`   📏 Content length: ${content.length} characters`);
    console.log(`   📄 Content preview (first 200 chars): ${content.substring(0, 200).replace(/\n/g, ' ')}...`);
    
    // CRITICAL FIX: Check if content is likely from TOC
    if (content.length < 200 && /\.{3,}.*page\s+\d+/i.test(content)) {
      console.log(`   🚫 SKIPPED: Content appears to be from Table of Contents`);
      console.log(`      Reason: Too short (${content.length} chars) + TOC pattern detected`);
      console.log(`      Content: "${content.substring(0, 80)}..."`);
      return; // Skip this clause entirely
    }
    
    if (content.length < 100 && !/\b(shall|must|will|should)\b/i.test(content)) {
      console.log(`   ⚠️  WARNING: Content very short and no requirement verbs found`);
      console.log(`      Likely TOC content: "${content.substring(0, 80)}..."`);
      // Don't skip yet, but log for debugging
    }
    
    // Validate clause content quality
    if (!isValidClauseContent(content, clauseNumber)) {
      console.log(`   ❌ INVALID CLAUSE CONTENT (likely TOC):`);
      console.log(`      Length: ${content.length} chars`);
      console.log(`      Content: "${content.substring(0, 100)}..."`);
      return; // Skip this clause
    }
    
    // DEBUG: Log empty content for clauses 4.1-4.3
    if (['4.1', '4.2', '4.3'].includes(clauseNumber) && (!content || content.trim().length === 0)) {
      console.error(`   ❌ CRITICAL: Clause ${clauseNumber} has EMPTY content!`);
      console.error(`   This indicates PDF text extraction failed for this clause.`);
    }
    
    // Store clause metadata
    this.clauses.push({
      clause_id: this.generateClauseId(section.clauseNumber, section.content.substring(0, 100)),
      clause_number: clauseNumber,
      clause_title: clauseTitle,
      content_length: content.length,
    });
    
    // Update clause hierarchy for standardized format
    const parts = clauseNumber.split('.');
    const topLevel = parts[0];
    const level = parts.length;
    
    // Store in hierarchy
    if (!this.clauseHierarchy.has(clauseNumber)) {
      this.clauseHierarchy.set(clauseNumber, {
        name: clauseTitle,
        level: level,
        topLevel: topLevel,
        parent: level > 1 ? parts.slice(0, -1).join('.') : null
      });
    }
    
    // If this is a top-level clause, store it separately
    if (level === 1) {
      this.clauseHierarchy.set(topLevel, {
        name: clauseTitle,
        level: 1,
        topLevel: topLevel,
        parent: null
      });
    }
    
    // Initialize paragraph counter for this subclause
    if (!this.paragraphCounters.has(clauseNumber)) {
      this.paragraphCounters.set(clauseNumber, 0);
    }
    
    // Extract requirements from this clause's content
    const requirements = this.extractRequirementsFromClause(
      content,
      clauseNumber,
      clauseTitle
    );
    
    // DEBUG: Log details for ZERO-requirement clauses
    if (requirements.length === 0) {
      console.log(`\n⚠️ ZERO REQUIREMENTS from [${clauseNumber}] - DEBUGGING:`);
      console.log(`   Content length: ${content.length} characters`);
      console.log(`   Has 'shall': ${/\bshall\b/i.test(content) ? 'YES' : 'NO'}`);
      console.log(`   Has requirement verbs: ${/\b(shall|must|will|are required to|is required to|has to|have to|is to|are to|should)\b/i.test(content) ? 'YES' : 'NO'}`);
      console.log(`   Content preview (first 300 chars):`);
      console.log(`   """${content.substring(0, 300)}"""`);
      console.log(`\n`);
    }
    
    console.log(`   ✓ Extracted ${requirements.length} requirement(s)`);
    
    for (const req of requirements) {
      this.requirements.push(req);
    }
  }

  /**
   * Extract requirements from a clause section
   * 
   * FIXED: Now properly splits lettered items into separate requirements
   * 
   * Algorithm:
   * 1. Split paragraph blocks on double newlines
   * 2. For each block, detect lettered items (a), b), c), etc.)
   * 3. If lettered items exist AND same main "shall" → SPLIT into separate reqs
   * 4. If lettered items DON'T match main shall → keep together (per spec)
   * 5. Create requirement with proper paragraph numbers (P1, P2, P3, etc.)
   */
  extractRequirementsFromClause(content, parentClause, clauseTitle) {
    const requirements = [];
    
    if (!content || !content.trim()) {
      console.log(`   ℹ️  Empty clause content for ${parentClause}`);
      return requirements;
    }

    try {
      // Step 1: Strip NOTES from content
      const { text: noNotes, notes } = stripNotes(content);
      
      if (notes.length > 0) {
        console.log(`   📝 Stripped ${notes.length} NOTE(s) from clause ${parentClause}`);
      }
      
      // Step 2: Remove clause headers that appear in content (subsequent clauses)
      let cleanedContent = noNotes.replace(/^\s*\d+(?:\.\d+){0,3}\s+[A-Z][^\n]{0,100}\s*$/gm, '');
      
      // Step 3: Split into paragraph blocks (separated by double newlines)
      const paragraphs = cleanedContent.split(/\n\n+/).filter(p => p.trim());
      
      console.log(`   📄 Split clause ${parentClause} into ${paragraphs.length} paragraph block(s)`);
      
      let paragraphNumber = 1;
      
      paragraphs.forEach((para) => {
        const trimmedPara = para.trim();
        
        if (!trimmedPara || trimmedPara.length < 10) {
          return; // Skip empty or very short paragraphs
        }
        
        // Check if this paragraph contains requirements (has obligation keywords)
        const hasObligation = /\b(shall|must|should|will|is required to|are required to|has to|have to|must not|shall not)\b/i.test(trimmedPara);
        
        if (!hasObligation) {
          return; // Skip non-requirement paragraphs
        }
        
        // ================================================================
        // FIXED LOGIC: Detect and split lettered items
        // ================================================================
        
        // Pattern to find lettered items: a), b), c), etc. (with newline before)
        const letterPattern = /\n\s*([a-z])\)\s+/gi;
        const letterMatches = [...trimmedPara.matchAll(letterPattern)];
        
        // Also check for patterns: a. b. (a) etc. (without newline requirement)
        const letterPatternAlt = /(?:^|\n)\s*([a-z])[.)]\s+/gi;
        const letterMatchesAlt = [...trimmedPara.matchAll(letterPatternAlt)];
        
        // Use whichever pattern found more matches
        const allMatches = letterMatches.length >= letterMatchesAlt.length ? letterMatches : letterMatchesAlt;
        const useAltPattern = letterMatches.length < letterMatchesAlt.length;
        
        // If we have lettered items (a, b, c, etc)
        if (allMatches.length > 0) {
          console.log(`      🔄 Block contains ${allMatches.length} lettered sub-items - will split into separate requirements`);
          
          // Extract the main text (before first letter)
          const firstMatch = allMatches[0];
          const firstLetterPos = firstMatch.index;
          const mainText = firstLetterPos > 0 
            ? trimmedPara.substring(0, firstLetterPos).trim()
            : trimmedPara;
          
          // Split each lettered item into separate requirement
          // Use the appropriate pattern based on which one matched
          const splitPattern = useAltPattern ? /(?:^|\n)\s*[a-z][.)]\s+/i : /\n\s*[a-z]\)\s+/i;
          const letterLines = trimmedPara.split(splitPattern);
          
          allMatches.forEach((match, idx) => {
            const letter = match[1]; // a, b, c, etc.
            
            // Get the content for this letter (idx+1 because first element is main text)
            if (idx + 1 >= letterLines.length) return;
            
            let letterContent = letterLines[idx + 1] || '';
            
            // Stop at next letter or end of paragraph
            if (idx + 1 < allMatches.length) {
              const nextMatch = allMatches[idx + 1];
              const nextPos = nextMatch.index;
              const currentEnd = match.index + match[0].length;
              if (nextPos > currentEnd) {
                letterContent = trimmedPara.substring(currentEnd, nextPos).trim();
              }
            }
            
            const letterText = letterContent.split(splitPattern)[0].trim();
            
            if (!letterText || letterText.length < 5) return; // Skip empty items
            
            // Create requirement text that includes the letter
            // Format: "main text: a) item text" or "main text. a) item text"
            let requirementText = mainText.trim();
            if (requirementText && !requirementText.endsWith(':') && !requirementText.endsWith('.')) {
              requirementText += ':';
            }
            requirementText = `${requirementText} ${letter}) ${letterText}`;
            
            // Clean up clause numbers that might be embedded
            requirementText = requirementText.replace(/^\s*\d+(?:\.\d+){0,3}\s+/, '');
            requirementText = requirementText.replace(/\s+\d+(?:\.\d+){0,3}\s+[A-Z][^\s]{0,50}/g, '');
            
            // Verify still has obligation keyword
            const hasRequirementVerb = /\b(shall|must|will|are required to|is required to|has to|have to|is to|are to|should)\b/i.test(requirementText);
            if (!hasRequirementVerb) {
              return; // Skip if no obligation keyword
            }
            
            // Increment paragraph counter (P1, P2, P3...)
            const currentParagraphCount = this.paragraphCounters.get(parentClause) || 0;
            this.paragraphCounters.set(parentClause, currentParagraphCount + 1);
            const paragraphNumber = `P${currentParagraphCount + 1}`;
            
            // Classify and create requirement
            const classification = classifySentence(requirementText, parentClause, true, currentParagraphCount + 1);
            
            const req = this.createStandardizedRequirement(
              requirementText,
              parentClause,
              clauseTitle,
              letterText.substring(0, 100),
              classification,
              paragraphNumber,
              /\bshall\b/i.test(requirementText),
              /\bmust\b/i.test(requirementText),
              /\bshould\b/i.test(requirementText),
              /\bmay\b/i.test(requirementText)
            );
            
            if (req) {
              requirements.push(req);
              console.log(`      ✅ Extracted [${parentClause}] [${paragraphNumber}] (sub-item ${letter}): "${req.requirement.substring(0, 70)}..."`);
            } else {
              this.paragraphCounters.set(parentClause, currentParagraphCount);
            }
          });
          
          // Return early - we've handled all lettered items
          return;
        }
        
        // ================================================================
        // ORIGINAL LOGIC: No lettered items, treat as single requirement
        // ================================================================
        
        // Clean the requirement text
        let fullRequirementText = trimmedPara.trim();
        fullRequirementText = fullRequirementText.replace(/^\s*\d+(?:\.\d+){0,3}\s+/, '');
        fullRequirementText = fullRequirementText.replace(/\s+\d+(?:\.\d+){0,3}\s+[A-Z][^\s]{0,50}/g, '');
        
        // Verify this still contains a requirement verb after cleaning
        const hasRequirementVerb = /\b(shall|must|will|are required to|is required to|has to|have to|is to|are to|should)\b/i.test(fullRequirementText);
        if (!hasRequirementVerb) {
          return;
        }
        
        // Increment paragraph counter (P1, P2, P3...)
        const currentParagraphCount = this.paragraphCounters.get(parentClause) || 0;
        this.paragraphCounters.set(parentClause, currentParagraphCount + 1);
        const paragraphNumber = `P${currentParagraphCount + 1}`;
        
        // Classify the requirement
        const classification = classifySentence(fullRequirementText, parentClause, true, currentParagraphCount + 1);
        
        // Create requirement object
        const req = this.createStandardizedRequirement(
          fullRequirementText,
          parentClause,
          clauseTitle,
          fullRequirementText.substring(0, 100),
          classification,
          paragraphNumber,
          /\bshall\b/i.test(fullRequirementText),
          /\bmust\b/i.test(fullRequirementText),
          /\bshould\b/i.test(fullRequirementText),
          /\bmay\b/i.test(fullRequirementText)
        );
        
        if (req) {
          requirements.push(req);
          console.log(`      ✅ Extracted [${parentClause}] [${paragraphNumber}]: "${req.requirement.substring(0, 70)}..."`);
        } else {
          this.paragraphCounters.set(parentClause, currentParagraphCount);
        }
        
        paragraphNumber++;
      });

      return requirements;

    } catch (error) {
      console.error(`⚠️  Error extracting requirements from ${parentClause}:`, error.message);
      console.error(`   Stack:`, error.stack);
      return requirements;
    }
  }

  /**
   * IMPROVED: Better requirement detection
   */
  isRequirementLine(text) {
    // These are definite requirement indicators
    const definiteIndicators = [
      /\bshall\b/i,
      /\bmust\b/i,
      /\bshould\b/i,
    ];
    
    // These are strong indicators
    const strongIndicators = [
      /\bthe organization\b/i,
      /\bthe supplier\b/i,
      /\bthe customer\b/i,
      /\bmanagement\b/i,
      /\brequirement\b/i,
      /\bshall ensure\b/i,
      /\bmust ensure\b/i,
    ];
    
    const lowerText = text.toLowerCase();
    
    // Must have at least one definite indicator
    const hasDefinite = definiteIndicators.some(pattern => pattern.test(lowerText));
    if (hasDefinite) return true;
    
    // Or strong indicators + minimum length
    const hasStrong = strongIndicators.some(pattern => pattern.test(lowerText));
    if (hasStrong && text.length > 30) return true;
    
    return false;
  }

  /**
   * Create standardized requirement object (NEW FORMAT)
   */
  createStandardizedRequirement(fullText, subclause, subclauseName, firstLine, classification, paragraphNumber, hasShall, hasMust, hasShould, hasMay) {
    // Clean requirement text
    const cleanedText = cleanRequirementText(fullText);
    
    if (!cleanedText || cleanedText.length < 10) return null;
    
    // Extract top-level clause number
    const topLevelClause = extractTopLevelClause(subclause);
    if (!topLevelClause) return null;
    
    // Get clause name from hierarchy
    const clauseName = getClauseName(this.clauseHierarchy, topLevelClause);
    
    // Get subclause name (use provided or from hierarchy)
    const finalSubclauseName = subclauseName || getSubclauseName(this.clauseHierarchy, subclause);
    
    // Determine if sub_paragraph should be included
    let subParagraph = null;
    if (shouldIncludeSubParagraph(subclause)) {
      subParagraph = formatSubParagraph(subclause, finalSubclauseName || subclause);
    }
    
    // Check if this is a note or example
    const isNote = /^note\b[\s:–-]/i.test(cleanedText) || (classification && classification.is_informative_note);
    const isExample = /^example\b[\s:–-]/i.test(cleanedText) || cleanedText.toLowerCase().includes('for example');
    
    // Calculate standardized confidence
    const confidence = calculateStandardizedConfidence(
      cleanedText,
      subclause,
      hasShall,
      hasMust,
      hasShould,
      hasMay,
      isNote,
      isExample
    );
    
    // Create standardized requirement object
    return createStandardizedRequirement({
      clause: topLevelClause,
      clause_name: clauseName,
      subclause: subclause,
      subclause_name: finalSubclauseName,
      paragraph: paragraphNumber,
      requirement: cleanedText,
      confidence: confidence,
      sub_paragraph: subParagraph
    });
  }

  /**
   * IMPROVED: Better requirement object creation with classification metadata and sub-refs
   * (LEGACY - kept for backward compatibility)
   */
  createRequirement(fullText, fullRef, clauseTitle, firstLine, classification = null, clauseRef = null, subRef = null, fullRefOverride = null) {
    // CRITICAL: Lower minimum length to capture more requirements
    if (!fullText || fullText.length < 10) return null;
    
    // Clean text (additional cleanup beyond sanitizeRaw)
    const text = this.cleanText(fullText);
    
    // CRITICAL: Lower minimum length after cleaning too
    if (text.length < 10) return null;
    
    // If classification provided, use it; otherwise classify now
    let reqClassification = classification;
    if (!reqClassification) {
      reqClassification = classifySentence(text, fullRef || fullRefOverride || clauseRef, false);
      if (reqClassification.kind !== 'requirement') {
        return null; // Not a requirement
      }
    }
    
    // Determine references
    const finalFullRef = fullRefOverride || fullRef || clauseRef;
    const finalClauseRef = clauseRef || (finalFullRef && finalFullRef.includes('.') ? finalFullRef.split('.').slice(0, -1).join('.') : finalFullRef);
    const finalSubRef = subRef || (finalFullRef && finalFullRef.includes('.') && finalFullRef !== finalClauseRef ? finalFullRef.split('.').pop() : null);
    
    // Classify intent
    const intent = this.classifyIntent(text);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(text, finalFullRef, clauseTitle);
    
    // Extract keywords
    const keywords = this.extractKeywords(text);
    
    // Detect requirement markers (for backward compatibility)
    const hasShall = text.toLowerCase().includes('shall');
    const hasMust = text.toLowerCase().includes('must');
    const hasShould = text.toLowerCase().includes('should');
    
    // Determine extraction flags
    const extractionFlags = [];
    if (subRef) extractionFlags.push('list_item');
    if (text !== fullText) extractionFlags.push('text_cleaned');
    
    // Generate deterministic requirement_uid
    const normalized = normalizeForId(text);
    const requirementUid = this.generateRequirementUid(finalFullRef, normalized);
    
    // Detect aerospace additions (AS9100-specific clauses)
    const aerospaceClauses = ['7.1.5.2', '8.1.1', '8.1.2', '8.1.3', '8.1.4', '8.3.4.1', '8.4.1.1', '8.5.1.3'];
    const isAerospace = aerospaceClauses.some(ac => {
      // Check if clause ref or full ref starts with the aerospace clause
      const clauseMatch = finalClauseRef && finalClauseRef.startsWith(ac);
      const fullMatch = finalFullRef && finalFullRef.startsWith(ac);
      return clauseMatch || fullMatch;
    });
    
    // Detect maintain vs retain documented information
    const lowerText = text.toLowerCase();
    const requiresMaintained = /\bmaintain(s)?\s+(documented\s+)?information\b/i.test(lowerText) ||
                               /\bmaintain(s)?\s+(the\s+)?(quality\s+)?policy\b/i.test(lowerText) ||
                               /\bmaintain(s)?\s+(a\s+)?(register|record|list)\b/i.test(lowerText);
    const requiresRetained = /\bretain(s)?\s+(documented\s+)?information\b/i.test(lowerText) ||
                             /\bretain(s)?\s+evidence\b/i.test(lowerText) ||
                             /\bretain(s)?\s+record(s)?\b/i.test(lowerText) ||
                             /\bretain(s)?\s+(the\s+)?(basis|results?|documentation)\b/i.test(lowerText);
    
    return {
      requirement_id: requirementUid, // For backward compatibility
      requirement_uid: requirementUid, // New deterministic ID
      clause_number: finalFullRef, // Use full_ref as clause_number for backward compatibility
      clause_ref: finalClauseRef,
      sub_ref: finalSubRef,
      full_ref: finalFullRef,
      clause_title: clauseTitle,
      requirement_text: text,
      first_line: firstLine.substring(0, 120),
      intent: intent,
      keywords: keywords,  // Keep as array - let storage layer handle conversion
      confidence: confidence,
      // Classification metadata
      requirement_type: reqClassification.requirement_type,
      requirement_subtype: reqClassification.requirement_subtype,
      clause_path_depth: reqClassification.clause_path_depth,
      subject_text: reqClassification.subject_text,
      modal_verb: reqClassification.modal_verb,
      is_informative_note: reqClassification.is_informative_note || false,
      is_recommendation: reqClassification.is_recommendation || false,
      is_in_scope: reqClassification.is_in_scope !== false, // Default true
      extraction_flags: extractionFlags,
      text_length: text.length,
      has_shall: hasShall,
      has_must: hasMust,
      has_should: hasShould,
      // NEW: Aerospace and documentation flags
      aerospace_addition: isAerospace,
      requires_maintained_di: requiresMaintained,
      requires_retained_di: requiresRetained,
    };
  }

  /**
   * IMPROVED: Better text cleaning for AS9100D
   */
  cleanText(text) {
    return text
      // Remove sub-clause markers from beginning
      .replace(/^[a-z]\)\s+/i, '')
      // Remove page numbers and headers
      .replace(/^Page\s+\d+.*$/gm, '')
      // Remove reference patterns like "(see 4.2.1)" or "ISO 9001"
      .replace(/\(see\s+[\d.]+.*?\)/gi, '')
      .replace(/ISO\s+\d+.*?(?:\s|$)/gi, '')
      // Remove footnote markers
      .replace(/[\^\*†‡§¶†]/g, '')
      // Remove excessive whitespace
      .replace(/\n\s*\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * IMPROVED: Better confidence calculation
   */
  calculateConfidence(text, clauseRef, clauseTitle) {
    let confidence = 0.65; // Base
    
    // Mandatory language boost
    if (text.toLowerCase().includes('shall')) confidence += 0.18;
    else if (text.toLowerCase().includes('must')) confidence += 0.16;
    else if (text.toLowerCase().includes('should')) confidence += 0.12;
    else if (text.toLowerCase().includes('will')) confidence += 0.08;
    
    // Clause structure boost
    if (clauseRef && clauseRef !== 'N/A') {
      confidence += 0.05;
      // More specific clauses get slightly higher confidence
      if (clauseRef.includes('.')) confidence += 0.02;
    }
    
    // Length boost (more specific = higher confidence)
    if (text.length > 50) confidence += 0.05;
    if (text.length > 150) confidence += 0.03;
    if (text.length > 300) confidence += 0.02;
    
    // Reduce if too short
    if (text.length < 20) confidence -= 0.10;
    
    // Reduce if looks like a note or example
    if (text.toLowerCase().match(/^(note|example|informative|see)/)) {
      confidence -= 0.20;
    }
    
    return Math.min(0.99, Math.max(0.35, confidence));
  }

  /**
   * Classify requirement intent
   */
  classifyIntent(text) {
    const lower = text.toLowerCase();
    
    if (lower.match(/process|procedure|establish/i)) return 'PROCESS';
    if (lower.match(/control|measure|safeguard/i)) return 'CONTROL';
    if (lower.match(/competence|training|skill|education/i)) return 'COMPETENCE';
    if (lower.match(/communicate|inform|notify/i)) return 'COMMUNICATION';
    if (lower.match(/supplier|external|provider|vendor/i)) return 'SUPPLIER';
    if (lower.match(/change|modification|update/i)) return 'CHANGE';
    if (lower.match(/risk|hazard|threat/i)) return 'RISK';
    if (lower.match(/incident|nonconformance|defect|finding/i)) return 'INCIDENT';
    if (lower.match(/document|record|evidence/i)) return 'EVIDENCE';
    
    return 'OTHER';
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    const words = text
      .toLowerCase()
      .split(/[\s,;:.()]+/)
      .filter(w => w.length > 3)
      .slice(0, 10);
    
    return words;
  }

  /**
   * Build clause hierarchy (FIXED - less strict validation)
   */
  buildClauseHierarchy(clauses) {
    console.log(`\n📋 Building clause structure for ${this.standardCode}...`);

    const hierarchy = {};
    const validClauses = [];
    const invalidClauses = [];

    for (const clause of clauses) {
      const parts = clause.number.split('.').map(Number);
      
      // In ISO standards, you can have:
      // 4
      // 4.1 (no 4 parent needed - it's the first sub-clause)
      // 4.1.1
      // This is VALID. Only warn if it's clearly orphaned.
      
      const isOrphaned = this.isClauseOrphaned(clause.number, clauses);
      
      if (!isOrphaned) {
        validClauses.push(clause);
        hierarchy[clause.number] = clause;
      } else {
        invalidClauses.push(clause);
        console.warn(`⚠️  Orphaned clause: ${clause.number} (no related parent/sibling clauses)`);
      }
    }

    console.log(`✅ Validated clause hierarchy: ${validClauses.length} valid clauses`);
    
    if (invalidClauses.length > 0) {
      console.log(`⚠️  Skipped ${invalidClauses.length} orphaned clauses`);
    }

    return validClauses;
  }

  /**
   * Check if clause is truly orphaned (not just missing parent)
   */
  isClauseOrphaned(clauseNumber, allClauses) {
    const parts = clauseNumber.split('.').map(Number);
    
    // Level 1 clauses (4, 5, 8) are never orphaned
    if (parts.length === 1) return false;
    
    // Level 2+ clauses (4.1, 8.7) are valid if:
    // 1. There's a related clause (same first number)
    const basePart = parts[0];
    const hasRelated = allClauses.some(c => {
      const cParts = c.number.split('.').map(Number);
      return cParts[0] === basePart && c.number !== clauseNumber;
    });
    
    if (hasRelated) return false;
    
    // 2. Or if it's close to another clause
    const clauseValue = parts.reduce((a, b) => a * 1000 + b, 0);
    const hasNearby = allClauses.some(c => {
      const cParts = c.number.split('.').map(Number);
      const cValue = cParts.reduce((a, b) => a * 1000 + b, 0);
      const distance = Math.abs(cValue - clauseValue);
      return distance > 0 && distance < 10; // Within 10 units
    });
    
    return !hasNearby;
  }

  /**
   * Group parent requirements with their list items
   * Returns array of { parentAtom, childAtoms, allText }
   * FIXED: Less aggressive grouping - only group when there's a clear parent-child relationship
   */
  groupRequirementsWithLists(atoms, parentClause, clauseTitle) {
    const groups = [];
    let currentParent = null;
    let currentChildren = [];
    
    for (const atom of atoms) {
      const hasShall = /\bshall\b/i.test(atom.text);
      const hasMust = /\bmust\b/i.test(atom.text);
      const hasWill = /\bwill\b/i.test(atom.text);
      const hasShould = /\bshould\b/i.test(atom.text);
      const hasRequirementKeyword = hasShall || hasMust || hasWill || hasShould;
      const isIncomplete = /[:;]\s*$|including\s*[:;]?\s*$|such\s+as\s*[:;]?\s*$/i.test(atom.text);
      const hasSubRef = atom.sub_ref && atom.sub_ref.length > 0;
      
      // If we have a current parent and this is a child (has sub_ref), add to children
      if (currentParent && hasSubRef) {
        currentChildren.push(atom);
        continue;
      }
      
      // If we have a current parent and this is NOT a child, finalize the group
      if (currentParent) {
        // Format all text: parent + children
        let allText = currentParent.text;
        if (currentChildren.length > 0) {
          const childrenText = currentChildren.map(c => {
            const prefix = c.sub_ref ? `${c.sub_ref}. ` : '';
            return `${prefix}${c.text}`;
          }).join(' ');
          allText = `${allText} ${childrenText}`;
        }
        
        groups.push({
          parentAtom: currentParent,
          childAtoms: currentChildren,
          allText: allText
        });
        
        currentParent = null;
        currentChildren = [];
      }
      
      // CRITICAL FIX: Only start a new parent group if:
      // 1. Has requirement keyword AND is incomplete (introduces a list), OR
      // 2. Has requirement keyword AND has no sub_ref (standalone parent requirement)
      if (hasRequirementKeyword && (isIncomplete || !hasSubRef)) {
        currentParent = atom;
        currentChildren = [];
      } else {
        // All other atoms are treated as standalone requirements (even if they don't have keywords yet)
        // This ensures we don't skip requirements that might be classified later
        groups.push({
          parentAtom: atom,
          childAtoms: [],
          allText: atom.text
        });
      }
    }
    
    // Finalize any remaining group
    if (currentParent) {
      let allText = currentParent.text;
      if (currentChildren.length > 0) {
        const childrenText = currentChildren.map(c => {
          const prefix = c.sub_ref ? `${c.sub_ref}. ` : '';
          return `${prefix}${c.text}`;
        }).join(' ');
        allText = `${allText} ${childrenText}`;
      }
      
      groups.push({
        parentAtom: currentParent,
        childAtoms: currentChildren,
        allText: allText
      });
    }
    
    return groups;
  }

  /**
   * Parse entire document
   */
  parse(text) {
    this.clauses = [];
    this.requirements = [];
    this.clauseHierarchy = new Map();
    this.paragraphCounters = new Map();
    
    const sections = this.splitByClauses(text);
    
    // CRITICAL FIX: Sort sections by clause number to ensure proper ordering
    // This ensures requirements are extracted in the correct order
    sections.sort((a, b) => {
      const aParts = a.clauseNumber.split('.').map(Number);
      const bParts = b.clauseNumber.split('.').map(Number);
      
      // Compare each part
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;
        if (aPart !== bPart) {
          return aPart - bPart;
        }
      }
      return 0;
    });
    
    // Track TOC entries for reporting
    const tocEntriesSkipped = [];
    const validClauses = [];
    
    for (const section of sections) {
      // Check if this section is TOC before processing
      if (isTOCEntry(section.content)) {
        tocEntriesSkipped.push(section);
        continue;
      }
      
      // Validate content before processing
      if (!isValidClauseContent(section.content, section.clauseNumber)) {
        tocEntriesSkipped.push(section);
        continue;
      }
      
      validClauses.push(section);
      this.parseClauseSection(section);
    }
    
    // Log TOC analysis
    console.log(`\n📊 CLAUSE CONTENT ANALYSIS FOR ${this.standardCode}:`);
    console.log(`   Total clauses found: ${sections.length}`);
    console.log(`   Clauses with valid content (not TOC): ${validClauses.length}`);
    console.log(`   TOC entries skipped: ${tocEntriesSkipped.length}`);
    console.log(`\n📋 Detailed breakdown (first 20 clauses):`);
    sections.slice(0, 20).forEach(clause => {
      const contentLength = clause.content ? clause.content.length : 0;
      const isTOC = isTOCEntry(clause.content);
      const isValid = isValidClauseContent(clause.content, clause.clauseNumber);
      const status = isTOC ? '(TOC - SKIPPED)' : (isValid ? '(VALID)' : '(INVALID - SKIPPED)');
      console.log(`   Clause ${clause.clauseNumber}: ${contentLength} chars ${status}`);
    });
    
    // CRITICAL FIX: Sort requirements by clause number and paragraph
    this.requirements.sort((a, b) => {
      // First sort by clause number
      const aParts = (a.subclause || a.clause || '0').split('.').map(Number);
      const bParts = (b.subclause || b.clause || '0').split('.').map(Number);
      
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;
        if (aPart !== bPart) {
          return aPart - bPart;
        }
      }
      
      // Then sort by paragraph (P1, P2, P3, etc.)
      const aPara = parseInt((a.paragraph || 'P0').replace('P', ''), 10);
      const bPara = parseInt((b.paragraph || 'P0').replace('P', ''), 10);
      return aPara - bPara;
    });
    
    return {
      clauses: this.clauses,
      requirements: this.requirements,
      totalClauses: this.clauses.length,
      totalRequirements: this.requirements.length,
    };
  }
}

