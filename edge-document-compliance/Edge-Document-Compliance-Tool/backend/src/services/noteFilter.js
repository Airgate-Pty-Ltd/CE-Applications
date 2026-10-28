/**
 * Note Filter
 * Removes NOTE paragraphs from clause content
 * NOTES are excluded from requirement text but can be stored separately
 */

/**
 * Strip NOTE paragraphs from a block
 * Returns cleaned text and collected notes
 */
export function stripNotes(block) {
  if (!block || typeof block !== 'string') {
    return { text: '', notes: [] };
  }
  
  const lines = block.split(/\n+/);
  const kept = [];
  const notes = [];
  let inNoteBlock = false;
  let currentNote = null;
  
  for (const ln of lines) {
    const t = ln.trim();
    
    // Detect NOTE start: "NOTE:", "Note -", "Note:", "NOTE -", etc.
    if (/^note\b[\s:–-]/i.test(t)) {
      inNoteBlock = true;
      currentNote = t;
      notes.push(t);
      continue;
    }
    
    // If we're in a NOTE block, continue collecting until we hit a new paragraph or clause marker
    if (inNoteBlock) {
      // Check if this line starts a new section (clause number, bullet, etc.)
      if (/^\d+(?:\.\d+)*\s+\S/.test(t) || // Clause number
          /^[a-z]\)\s+/i.test(t) ||         // Letter bullet
          /^\d+\)\s+/.test(t) ||            // Number bullet
          /^[A-Z][a-z]+\s+[A-Z]/.test(t)) { // New sentence starting with capital
        inNoteBlock = false;
        currentNote = null;
        kept.push(ln);
      } else {
        // Continue collecting note text
        if (currentNote) {
          notes[notes.length - 1] += ' ' + t;
        } else {
          notes.push(t);
        }
      }
      continue;
    }
    
    // Regular line - keep it
    kept.push(ln);
  }
  
  return {
    text: kept.join('\n').trim(),
    notes: notes.filter(n => n && n.trim().length > 0)
  };
}

/**
 * Check if text contains any NOTE markers
 */
export function hasNotes(text) {
  if (!text || typeof text !== 'string') return false;
  return /^note\b[\s:–-]/im.test(text);
}

