/**
 * Paragraph Splitter
 * Splits clause content into paragraphs by blank lines
 * Keeps list items (a, b, c) with their parent paragraph
 */

/**
 * Split text into paragraphs by blank lines
 * List items within a paragraph are kept together
 * @param {string} text - The text to split
 * @returns {Array<{text: string, hasShall: boolean, listItems: Array}>} Array of paragraph objects
 */
export function splitIntoParagraphs(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split by 2+ blank lines (paragraph separator)
  const paragraphBlocks = normalized.split(/\n\n+/);
  
  const paragraphs = [];
  
  for (const block of paragraphBlocks) {
    const trimmed = block.trim();
    if (!trimmed || trimmed.length < 10) {
      continue; // Skip empty or very short blocks
    }
    
    // Check if this paragraph contains "shall"
    const hasShall = /\bshall\b/i.test(trimmed);
    
    // Extract list items (a., b., c., 1., 2., etc.) if present
    const lines = trimmed.split(/\n/).map(l => l.trim()).filter(Boolean);
    const listItems = [];
    let mainText = '';
    let inList = false;
    
    for (const line of lines) {
      // Check for list item markers
      const letterMatch = line.match(/^\s*([a-z])\.\s+/i);
      const numMatch = line.match(/^\s*(\d+)\.\s+/);
      const letterParen = line.match(/^\s*\(([a-z])\)\s+/i);
      const numParen = line.match(/^\s*\((\d+)\)\s+/);
      
      if (letterMatch || numMatch || letterParen || numParen) {
        // This is a list item
        inList = true;
        const marker = letterMatch?.[1] || numMatch?.[1] || letterParen?.[1] || numParen?.[1];
        const itemText = line.replace(/^\s*([a-z]|\d+)\.\s+/, '').replace(/^\s*\(([a-z]|\d+)\)\s+/, '').trim();
        listItems.push({
          marker: marker,
          text: itemText
        });
      } else if (inList && line.length > 0) {
        // Continuation of last list item
        if (listItems.length > 0) {
          listItems[listItems.length - 1].text += ' ' + line;
        }
      } else {
        // Regular text - part of main paragraph
        if (mainText) {
          mainText += ' ' + line;
        } else {
          mainText = line;
        }
      }
    }
    
    // If we have list items, combine them with main text
    let fullText = mainText;
    if (listItems.length > 0) {
      const listText = listItems.map(item => `${item.marker}) ${item.text}`).join(' ');
      fullText = `${mainText} ${listText}`;
    }
    
    paragraphs.push({
      text: fullText.trim(),
      mainText: mainText.trim(),
      listItems: listItems,
      hasShall: hasShall
    });
  }
  
  return paragraphs;
}

/**
 * Format requirement text with list items
 * @param {string} mainText - The main requirement text
 * @param {Array} listItems - Array of list items
 * @returns {string} Formatted requirement text
 */
export function formatRequirementWithList(mainText, listItems) {
  if (!listItems || listItems.length === 0) {
    return mainText;
  }
  
  // Format: "main text: a) item a b) item b c) item c"
  const listText = listItems.map(item => `${item.marker}) ${item.text}`).join(' ');
  return `${mainText}: ${listText}`;
}

