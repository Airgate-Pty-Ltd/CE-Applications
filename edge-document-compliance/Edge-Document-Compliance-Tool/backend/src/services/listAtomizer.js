/**
 * List Atomizer
 * Detects and atomizes list items (a., b., c., 1., 2., etc.) into separate requirements
 * Each item gets a stable sub-reference (e.g., 8.5.1.a, 8.5.1.c.2)
 */

// Patterns for detecting list items
const LETTER_ITEM = /^\s*([a-hj-z])\.\s+/i;  // Skip 'i' vs 'l' ambiguity
const NUM_ITEM = /^\s*(\d+)\.\s+/;
const LETTER_PAREN = /^\s*\(([a-hj-z])\)\s+/i;
const NUM_PAREN = /^\s*\((\d+)\)\s+/;
const DASH_ITEM = /^\s*[-–—]\s+/;

/**
 * Atomize a clause's content into separate list items
 * Returns array of { clause_ref, sub_ref, full_ref, text }
 */
export function atomizeList(clauseNumber, clauseText) {
  if (!clauseText || typeof clauseText !== 'string') {
    return [{
      clause_ref: clauseNumber,
      sub_ref: null,
      full_ref: clauseNumber,
      text: clauseText || ''
    }];
  }
  
  // CRITICAL FIX: Split by single newlines first to catch list items
  // Many PDFs have list items on separate lines, not paragraphs
  const lines = clauseText.split(/\n/).map(l => l.trim()).filter(Boolean);
  
  if (lines.length === 0) {
    return [{
      clause_ref: clauseNumber,
      sub_ref: null,
      full_ref: clauseNumber,
      text: clauseText
    }];
  }
  
  const items = [];
  let currentLetter = null;
  let currentNum = null;
  let hadBullets = false;
  let parentShall = false; // Track if parent has "shall"
  
  // Check if the clause text contains "shall" (parent requirement)
  if (/\bshall\b|\bmust\b/i.test(clauseText)) {
    parentShall = true;
  }
  
  // Process line by line to catch list items
  // Track incomplete sentences that need continuation
  let incompleteBuffer = null;
  
  for (let line of lines) {
    line = line.trim();
    if (!line) {
      // Empty line - if we have incomplete buffer, finalize it
      if (incompleteBuffer) {
        items.push({
          sub_ref: incompleteBuffer.sub_ref,
          text: incompleteBuffer.text,
          depth: incompleteBuffer.depth,
          children: incompleteBuffer.children,
          parentShall: incompleteBuffer.parentShall,
          hadBullets: incompleteBuffer.hadBullets
        });
        incompleteBuffer = null;
      }
      continue;
    }
    
    // CRITICAL: Filter table of contents - lines with many periods or TOC patterns
    const dotCount = (line.match(/\./g) || []).length;
    const hasManyPeriods = (line.match(/\.{3,}/g) || []).length > 0; // 3+ consecutive periods
    const isTOCPattern = line.match(/^[A-Z\s]+\.{10,}/); // Uppercase word followed by 10+ periods
    const isMostlyPeriods = line.length > 20 && (dotCount / line.length) > 0.3; // More than 30% periods
    
    if (dotCount > 5 || hasManyPeriods || isTOCPattern || isMostlyPeriods) {
      continue; // Skip table of contents entry
    }
    
    // Check if line ends with incomplete sentence markers (colon, semicolon, "including", etc.)
    const isIncomplete = /[:;]\s*$|including\s*[:;]?\s*$|such\s+as\s*[:;]?\s*$/i.test(line);
    
    // Check for letter items: "a. ", "b. ", "a)", "(a)", etc.
    let letterMatch = line.match(LETTER_ITEM);
    if (!letterMatch) {
      letterMatch = line.match(LETTER_PAREN);
    }
    
    if (letterMatch) {
      const letter = letterMatch[1].toLowerCase();
      const body = line.replace(LETTER_ITEM, '').replace(LETTER_PAREN, '').trim();
      currentLetter = letter;
      currentNum = null;
      hadBullets = true;
      items.push({
        sub_ref: letter,
        text: body,
        depth: 1,
        children: [],
        parentShall: parentShall // Inherit parent "shall"
      });
      continue;
    }
    
    // Check for number items: "1. ", "2. ", "1)", "(1)", etc.
    let numMatch = line.match(NUM_ITEM);
    if (!numMatch) {
      numMatch = line.match(NUM_PAREN);
    }
    
    if (numMatch && currentLetter) {
      // Nested number under a letter (e.g., "c.1", "c.2")
      const num = numMatch[1];
      const body = line.replace(NUM_ITEM, '').replace(NUM_PAREN, '').trim();
      currentNum = num;
      
      // Attach as child to last letter item
      const parent = items.find(it => it.sub_ref === currentLetter && it.depth === 1);
      if (parent) {
        parent.children.push({
          sub_ref: `${currentLetter}.${num}`,
          text: body,
          depth: 2,
          parentShall: parentShall
        });
      }
      continue;
    } else if (numMatch && !currentLetter) {
      // Top-level number item (no parent letter)
      const num = numMatch[1];
      const body = line.replace(NUM_ITEM, '').replace(NUM_PAREN, '').trim();
      currentLetter = null;
      currentNum = num;
      hadBullets = true;
      items.push({
        sub_ref: num,
        text: body,
        depth: 1,
        children: [],
        parentShall: parentShall
      });
      continue;
    }
    
    // Check for dash items: "- ", "– ", etc.
    if (DASH_ITEM.test(line)) {
      const body = line.replace(DASH_ITEM, '').trim();
      if (currentLetter) {
        // Dash item under a letter - treat as continuation or new sub-item
        const parent = items.find(it => it.sub_ref === currentLetter && it.depth === 1);
        if (parent && parent.children.length === 0) {
          // No numeric children yet - append to letter item
          parent.text += ' ' + body;
        } else if (parent && parent.children.length > 0) {
          // Append to last numeric child
          const last = parent.children[parent.children.length - 1];
          last.text += ' ' + body;
        }
      } else {
        // Top-level dash item
        hadBullets = true;
        items.push({
          sub_ref: null,
          text: body,
          depth: 0,
          children: [],
          parentShall: parentShall
        });
      }
      continue;
    }
    
    // If we have a current letter, append to the last item's text (continuation line)
    if (currentLetter) {
      const parent = items.find(it => it.sub_ref === currentLetter && it.depth === 1);
      if (parent && parent.children.length === 0) {
        parent.text += ' ' + line;
      } else if (parent && parent.children.length > 0) {
        // Continuation of the last numeric child
        const last = parent.children[parent.children.length - 1];
        last.text += ' ' + line;
      }
      continue;
    }
    
    // If we have a current number (top-level), append to it
    if (currentNum && !currentLetter) {
      const parent = items.find(it => it.sub_ref === currentNum && it.depth === 1);
      if (parent) {
        parent.text += ' ' + line;
      }
      continue;
    }
    
    // Check if this line starts a new requirement block (has "shall" or "must")
    if (/\bshall\b|\bmust\b/i.test(line) && !currentLetter && !currentNum) {
      // If we have an incomplete buffer, finalize it first
      if (incompleteBuffer) {
        items.push({
          sub_ref: incompleteBuffer.sub_ref,
          text: incompleteBuffer.text,
          depth: incompleteBuffer.depth,
          children: incompleteBuffer.children,
          parentShall: incompleteBuffer.parentShall,
          hadBullets: incompleteBuffer.hadBullets
        });
        incompleteBuffer = null;
      }
      
      // This is a new requirement - start a new item
      const newItem = {
        sub_ref: null,
        text: line,
        depth: 0,
        children: [],
        parentShall: false,
        hadBullets: false
      };
      
      // If incomplete, store in buffer; otherwise add immediately
      if (isIncomplete) {
        incompleteBuffer = newItem;
      } else {
        items.push(newItem);
      }
      continue;
    }
    
    // If we're in a list context but this line doesn't match patterns, append to last item
    if (items.length > 0 && (currentLetter || currentNum)) {
      const lastItem = items[items.length - 1];
      if (lastItem.children.length > 0) {
        const lastChild = lastItem.children[lastItem.children.length - 1];
        lastChild.text += ' ' + line;
      } else {
        lastItem.text += ' ' + line;
      }
      continue;
    }
    
    // Handle incomplete buffer - append continuation text
    if (incompleteBuffer) {
      incompleteBuffer.text += ' ' + line;
      // If line completes the sentence (ends with period, or is a list item), finalize
      if (!isIncomplete && (line.match(/[.!?]\s*$/) || letterMatch || line.match(NUM_ITEM))) {
        items.push({
          sub_ref: incompleteBuffer.sub_ref,
          text: incompleteBuffer.text,
          depth: incompleteBuffer.depth,
          children: incompleteBuffer.children,
          parentShall: incompleteBuffer.parentShall,
          hadBullets: incompleteBuffer.hadBullets
        });
        incompleteBuffer = null;
      }
      continue;
    }
    
    // No bullets detected and no active list: treat as a single atomic item (fallback)
    const fallbackItem = {
      sub_ref: null,
      text: line,
      depth: 0,
      children: [],
      hadBullets: false,
      parentShall: /\bshall\b|\bmust\b/i.test(line)
    };
    
    // If incomplete, store in buffer; otherwise add immediately
    if (isIncomplete) {
      incompleteBuffer = fallbackItem;
    } else {
      items.push(fallbackItem);
    }
  }
  
  // Finalize any remaining incomplete buffer
  if (incompleteBuffer) {
    items.push({
      sub_ref: incompleteBuffer.sub_ref,
      text: incompleteBuffer.text,
      depth: incompleteBuffer.depth,
      children: incompleteBuffer.children,
      parentShall: incompleteBuffer.parentShall,
      hadBullets: incompleteBuffer.hadBullets
    });
    incompleteBuffer = null;
  }
  
  // Flatten children into siblings, providing full_ref
  const flattened = [];
  
  for (const it of items) {
    if (it.depth === 1 && it.children.length === 0) {
      // Letter/number item with no children
      flattened.push({
        clause_ref: clauseNumber,
        sub_ref: it.sub_ref,
        full_ref: it.sub_ref ? `${clauseNumber}.${it.sub_ref}` : clauseNumber,
        text: it.text,
        hadBullets: hadBullets,
        parentShall: it.parentShall || false
      });
    } else if (it.depth === 1 && it.children.length > 0) {
      // Letter item with numeric children
      flattened.push({
        clause_ref: clauseNumber,
        sub_ref: it.sub_ref,
        full_ref: `${clauseNumber}.${it.sub_ref}`,
        text: it.text,
        hadBullets: hadBullets,
        parentShall: it.parentShall || false
      });
      
      // Add children as separate items
      for (const c of it.children) {
        flattened.push({
          clause_ref: clauseNumber,
          sub_ref: c.sub_ref,
          full_ref: `${clauseNumber}.${c.sub_ref}`,
          text: c.text,
          hadBullets: hadBullets,
          parentShall: c.parentShall || false
        });
      }
    } else if (it.depth === 0) {
      // No sub-ref (regular paragraph or requirement)
      flattened.push({
        clause_ref: clauseNumber,
        sub_ref: null,
        full_ref: clauseNumber,
        text: it.text,
        hadBullets: it.hadBullets || false,
        parentShall: it.parentShall || false
      });
    }
  }
  
  // If no items were created, return the original text as a single item
  if (flattened.length === 0) {
    return [{
      clause_ref: clauseNumber,
      sub_ref: null,
      full_ref: clauseNumber,
      text: clauseText,
      hadBullets: false
    }];
  }
  
  return flattened;
}

