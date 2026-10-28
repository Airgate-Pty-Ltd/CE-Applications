/**
 * Universal Compliance Parser v1.0.0
 * Handles: Standards, Regulations, Customer Requirements
 * Auto-detects type and applies appropriate parsing logic
 */

class UniversalComplianceParser {
  constructor(version = '1.0.0') {
    this.version = version;
    this.documentType = null;
    this.requirements = [];
  }

  /**
   * MAIN ENTRY POINT - Parse any compliance document
   */
  async parse(content, metadata = {}) {
    try {
      // Step 1: Detect document type
      this.documentType = this.detectDocumentType(content, metadata);
      console.log(`[PARSER] Detected type: ${this.documentType}`);

      // Step 2: Parse based on type
      let requirements = [];
      
      if (this.documentType === 'STANDARD') {
        requirements = this.parseStandard(content, metadata);
      } else if (this.documentType === 'REGULATION') {
        requirements = this.parseRegulation(content, metadata);
      } else if (this.documentType === 'CUSTOMER') {
        requirements = this.parseCustomerRequirement(content, metadata);
      } else {
        throw new Error('Unknown document type');
      }

      // Step 3: Sort by document type
      requirements = this.sortByType(requirements, this.documentType);
      
      console.log(`[PARSER] Extracted ${requirements.length} requirements`);
      if (requirements.length > 0) {
        console.log(`[PARSER] First: ${requirements[0]?.reference || requirements[0]?.clause_number || 'N/A'}, Last: ${requirements[requirements.length-1]?.reference || requirements[requirements.length-1]?.clause_number || 'N/A'}`);
      }

      this.requirements = requirements;
      return requirements;
    } catch (error) {
      console.error('❌ Parser error:', error.message);
      throw error;
    }
  }

  /**
   * AUTO-DETECT DOCUMENT TYPE
   */
  detectDocumentType(content, metadata) {
    const text = content.toLowerCase();
    
    // STANDARD indicators
    if (text.match(/iso\s*9001|iso\s*13485|iatf\s*16949|as\s*9100|as\s*9110|as\s*9120/i)) {
      if (text.match(/quality management system.*requirements/i)) {
        return 'STANDARD';
      }
    }

    // REGULATION indicators
    if (text.match(/14\s*cfr|21\s*cfr|casa|easa|part\s*21|part\s*145|ccar/i)) {
      return 'REGULATION';
    }

    // CUSTOMER REQUIREMENT indicators
    if (text.match(/boeing|airbus|embraer|medtronic|ge\s*healthcare|siemens/i)) {
      if (text.match(/supplier.*requirement|quality.*requirement|purchase.*order|production.*organization/i)) {
        return 'CUSTOMER';
      }
    }

    // Check metadata for hints
    if (metadata.documentName) {
      if (metadata.documentName.match(/boeing|airbus|embraer/i)) {
        return 'CUSTOMER';
      }
      if (metadata.documentName.match(/casa|faa|easa/i)) {
        return 'REGULATION';
      }
      if (metadata.documentName.match(/iso|iatf|as9/i)) {
        return 'STANDARD';
      }
    }

    // Check standard code from metadata
    if (metadata.standardCode) {
      const code = metadata.standardCode.toLowerCase();
      if (code.match(/casa|faa|easa|part\s*21|part\s*145/i)) {
        return 'REGULATION';
      }
      if (code.match(/boeing|airbus|embraer/i)) {
        return 'CUSTOMER';
      }
      if (code.match(/iso|iatf|as9/i)) {
        return 'STANDARD';
      }
    }

    // Default to STANDARD if uncertain (most common case)
    return 'STANDARD';
  }

  /**
   * PARSE STANDARDS (ISO 9001, AS9100D, etc.)
   * Structure: 4.1, 4.2, 4.3, 4.4.1, 4.4.2...
   * Requirement keyword: "shall"
   * Lists: a), b), c) are CONTINUATIONS of requirement, not separate
   */
  parseStandard(content, metadata) {
    const requirements = [];
    const lines = content.split('\n');
    
    let currentClause = null;
    let currentParagraph = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // CRITICAL: Skip Terms and Definitions section (clause 3)
      // Also skip clauses 1-2 (Scope, Normative References) - these are not requirements
      if (line.match(/^3(?:\.\d+)?\s+(terms|definitions|normative references|scope)/i) ||
          line.match(/^3(?:\.\d+)?\s*$/)) {
        // Skip entire clause 3 section
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j].trim();
          // Stop when we hit clause 4
          if (nextLine.match(/^4(?:\.\d+)?\s/)) {
            i = j - 1;
            break;
          }
          j++;
        }
        currentClause = null; // Clear clause to prevent extraction
        continue;
      }
      
      // Detect clause headers: 4.1, 4.2, 4.4.1, etc.
      // Pattern 1: "4.1 Title" (with title on same line)
      let clauseMatch = line.match(/^(\d+(?:\.\d+)+)\s+(.+)$/);
      
      // Pattern 2: "4.1" (standalone, title might be on next line)
      if (!clauseMatch) {
        clauseMatch = line.match(/^(\d+(?:\.\d+)+)\s*$/);
        if (clauseMatch && i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          // If next line looks like a title (not a clause number), use it
          if (nextLine && !nextLine.match(/^\d+(?:\.\d+)+/) && nextLine.length > 3 && nextLine.length < 200) {
            clauseMatch = [clauseMatch[0], clauseMatch[1], nextLine];
            i++; // Skip the title line
          }
        }
      }
      
      if (clauseMatch) {
        const clauseNumber = clauseMatch[1];
        const clauseTitle = clauseMatch[2] || '';
        
        // CRITICAL: Skip clauses 1-3 (Scope, Normative References, Terms and Definitions)
        const topLevel = parseInt(clauseNumber.split('.')[0], 10);
        if (topLevel < 4) {
          currentClause = null; // Clear clause to prevent extraction
          continue;
        }
        
        currentClause = {
          number: clauseNumber,
          title: clauseTitle
        };
        currentParagraph = 0;
        continue;
      }
      
      // Look for "shall" statements - ONLY if we're in a valid clause (4-10)
      if (line.match(/\b(shall|must|should|will|is required to|are required to|has to|have to)\b/i) && currentClause) {
        currentParagraph++;
        
        // Extract full statement (may span multiple lines)
        let fullStatement = line;
        let j = i + 1;
        
        while (j < lines.length) {
          const nextLine = lines[j].trim();
          
          // Stop if we hit a list item, new clause, or structural marker
          if (nextLine.match(/^[a-z]\)|^\d+\)/i) || 
              nextLine.match(/^(\d+(?:\.\d+)+)\s/)) {
            break;
          }
          
          // Continue statement
          if (nextLine && !nextLine.match(/^NOTE|^EXAMPLE/i)) {
            fullStatement += ' ' + nextLine;
            j++;
          } else {
            break;
          }
        }
        
        // Collect list items (a), b), c) or 1), 2), 3)
        const listItems = [];
        j = i + 1;
        
        while (j < lines.length) {
          const nextLine = lines[j].trim();
          const letterMatch = nextLine.match(/^([a-z])\)\s+(.+)$/i);
          const numberMatch = nextLine.match(/^(\d+)\)\s+(.+)$/);
          
          if (letterMatch) {
            listItems.push({
              letter: letterMatch[1],
              text: letterMatch[2]
            });
            j++;
          } else if (numberMatch && !fullStatement.match(/^\d+\)/)) {
            listItems.push({
              number: numberMatch[1],
              text: numberMatch[2]
            });
            j++;
          } else if (nextLine.match(/^[a-z]\)|^\d+\)/i) || 
                     nextLine.match(/^(\d+(?:\.\d+)+)\s/)) {
            break;
          } else {
            break;
          }
        }
        
        // Create requirement
        const requirement = {
          document_type: 'STANDARD',
          standard_name: metadata.standardName || metadata.name || 'Unknown',
          standard_code: metadata.standardCode || metadata.code || 'UNKNOWN',
          
          clause_number: currentClause.number,
          clause_title: currentClause.title,
          paragraph: currentParagraph,
          reference: `${currentClause.number}`,
          number: currentClause.number,
          
          requirement_text: fullStatement.trim(),
          list_items: listItems,
          list_count: listItems.length,
          
          keyword: 'shall',
          confidence: 0.95,
          extracted_at: new Date().toISOString(),
          model_version: this.version
        };
        
        requirements.push(requirement);
        i = j - 1;
      }
    }
    
    return requirements;
  }

  /**
   * PARSE REGULATIONS (CASA, FAA, EASA, etc.)
   * Structure: 21.139, 21.143, 21.147 with subsections (a), (b), (1), (1A)
   * Requirement keyword: "must", "shall"
   * Lists: (a), (b), (c) are SEPARATE requirements
   */
  parseRegulation(content, metadata) {
    const requirements = [];
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect section headers: 21.139, 21.143, 21.607, etc.
      const sectionMatch = line.match(/^(\d+\.\d+)\s+(.+)$/);
      if (!sectionMatch) continue;
      
      const sectionNumber = sectionMatch[1];
      const sectionTitle = sectionMatch[2];
      
      // Look for subsections: (a), (b), (1), (1A), (2)
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        
        // Subsection pattern: (a), (b), (1), (1A), etc.
        const subsectionMatch = nextLine.match(/^\(([a-z0-9]+)\)\s+(.+)$/i);
        
        if (subsectionMatch) {
          const subsection = subsectionMatch[1];
          let subsectionText = subsectionMatch[2];
          
          // Collect continuation lines
          let k = j + 1;
          while (k < lines.length) {
            const contLine = lines[k].trim();
            
            // Stop if we hit another subsection or new section
            if (contLine.match(/^\([a-z0-9]+\)/i) || 
                contLine.match(/^\d+\.\d+/)) {
              break;
            }
            
            if (contLine && !contLine.match(/^NOTE/i)) {
              subsectionText += ' ' + contLine;
              k++;
            } else {
              break;
            }
          }
          
          // Create requirement
          const requirement = {
            document_type: 'REGULATION',
            regulatory_body: metadata.regulatoryBody || metadata.authority_source || 'Unknown',
            regulation_reference: metadata.regulationReference || metadata.code || 'Unknown',
            
            section_number: sectionNumber,
            section_title: sectionTitle,
            subsection: subsection,
            subsection_reference: `${sectionNumber}(${subsection})`,
            reference: `${sectionNumber}(${subsection})`,
            number: `${sectionNumber}`,
            subclause: `(${subsection})`,
            
            requirement_text: subsectionText.trim(),
            
            keyword: 'must',
            confidence: 0.93,
            extracted_at: new Date().toISOString(),
            model_version: this.version
          };
          
          requirements.push(requirement);
          j = k;
        } else if (nextLine.match(/^\d+\.\d+/)) {
          break;
        } else {
          j++;
        }
      }
      
      i = j - 1;
    }
    
    return requirements;
  }

  /**
   * PARSE CUSTOMER REQUIREMENTS (Boeing, Airbus, etc.)
   * Structure: SQ01, SQ02... (Boeing) or A1505, A1501... (Airbus)
   */
  parseCustomerRequirement(content, metadata) {
    const requirements = [];
    const lines = content.split('\n');
    
    // Detect customer from content or metadata
    let customerCompany = metadata.customerName || 'Unknown';
    if (content.match(/boeing/i)) customerCompany = 'Boeing';
    if (content.match(/airbus/i)) customerCompany = 'Airbus';
    if (content.match(/embraer/i)) customerCompany = 'Embraer';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Boeing pattern: SQ01 – Quality management system, SQ02 – Quality records, etc.
      const boeingMatch = line.match(/^(SQ\d+)\s*[–-]\s*(.+)$/);
      
      // Airbus pattern: A1505 05.5035.D Section title or A1501 01.0005.D
      const airbusMatch = line.match(/^([A-Z]\d+\s+[\d.]+\.?[A-Z]?)\s+(.+)$/);
      
      let requirementRef = null;
      let requirementTitle = null;
      
      if (boeingMatch) {
        requirementRef = boeingMatch[1];
        requirementTitle = boeingMatch[2];
      } else if (airbusMatch) {
        requirementRef = airbusMatch[1];
        requirementTitle = airbusMatch[2];
      } else {
        continue;
      }
      
      // Extract requirement text
      let requirementText = '';
      let j = i + 1;
      const listItems = [];
      
      while (j < lines.length) {
        const nextLine = lines[j].trim();
        
        // Stop if we hit next requirement
        if (nextLine.match(/^SQ\d+\s*[–-]/) || 
            nextLine.match(/^[A-Z]\d+\s+[\d.]+/)) {
          break;
        }
        
        // Collect list items
        const letterMatch = nextLine.match(/^([a-z])\)\s+(.+)$/i);
        const numberMatch = nextLine.match(/^\((\d+)\)\s+(.+)$/);
        
        if (letterMatch) {
          listItems.push({
            letter: letterMatch[1],
            text: letterMatch[2]
          });
          j++;
        } else if (numberMatch) {
          listItems.push({
            number: numberMatch[1],
            text: numberMatch[2]
          });
          j++;
        } else if (nextLine && !nextLine.match(/^NOTE|^Note:/i)) {
          requirementText += (requirementText ? ' ' : '') + nextLine;
          j++;
        } else {
          break;
        }
      }
      
      // Create requirement
      const requirement = {
        document_type: 'CUSTOMER',
        customer_company: customerCompany,
        requirement_reference: requirementRef,
        reference: `${customerCompany}-${requirementRef}`,
        number: requirementRef,
        
        requirement_title: requirementTitle,
        requirement_text: requirementText.trim(),
        list_items: listItems,
        list_count: listItems.length,
        
        keyword: 'shall',
        confidence: 0.90,
        extracted_at: new Date().toISOString(),
        model_version: this.version
      };
      
      requirements.push(requirement);
      i = j - 1;
    }
    
    return requirements;
  }

  /**
   * SORT BY DOCUMENT TYPE
   */
  sortByType(requirements, docType) {
    if (docType === 'STANDARD') {
      return this.sortStandards(requirements);
    } else if (docType === 'REGULATION') {
      return this.sortRegulations(requirements);
    } else if (docType === 'CUSTOMER') {
      return this.sortCustomer(requirements);
    }
    return requirements;
  }

  /**
   * SORT STANDARDS: Numeric clause order (4.1, 4.2, 4.3, 4.4.1, 4.4.2...)
   */
  sortStandards(requirements) {
    return requirements.sort((a, b) => {
      const aParts = (a.clause_number || a.number || '').toString().split('.').map(x => parseInt(x, 10) || 0);
      const bParts = (b.clause_number || b.number || '').toString().split('.').map(x => parseInt(x, 10) || 0);

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        
        if (aVal !== bVal) {
          return aVal - bVal;
        }
      }

      return (a.paragraph || 0) - (b.paragraph || 0);
    });
  }

  /**
   * SORT REGULATIONS: Numeric section order (21.139, 21.143, 21.147...)
   */
  sortRegulations(requirements) {
    return requirements.sort((a, b) => {
      const aParts = (a.section_number || a.number || '').toString().split('.').map(x => parseInt(x, 10) || 0);
      const bParts = (b.section_number || b.number || '').toString().split('.').map(x => parseInt(x, 10) || 0);

      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aVal = aParts[i] || 0;
        const bVal = bParts[i] || 0;
        
        if (aVal !== bVal) {
          return aVal - bVal;
        }
      }

      const aSubsection = (a.subsection || '').toLowerCase();
      const bSubsection = (b.subsection || '').toLowerCase();
      
      const aSort = this.subsectionToNumber(aSubsection);
      const bSort = this.subsectionToNumber(bSubsection);
      
      return aSort - bSort;
    });
  }

  /**
   * SORT CUSTOMER REQUIREMENTS: By customer then by reference
   */
  sortCustomer(requirements) {
    return requirements.sort((a, b) => {
      const aCompany = (a.customer_company || '').toLowerCase();
      const bCompany = (b.customer_company || '').toLowerCase();
      
      if (aCompany !== bCompany) {
        return aCompany.localeCompare(bCompany);
      }

      const aRef = (a.requirement_reference || a.number || '').toLowerCase();
      const bRef = (b.requirement_reference || b.number || '').toLowerCase();
      
      const aNum = parseInt(aRef.match(/\d+/)?.[0] || '0', 10);
      const bNum = parseInt(bRef.match(/\d+/)?.[0] || '0', 10);
      
      return aNum - bNum || aRef.localeCompare(bRef);
    });
  }

  /**
   * Helper: Convert subsection like "a", "b", "1a", "2" to sortable number
   */
  subsectionToNumber(subsection) {
    if (!subsection) return 0;
    
    if (subsection.match(/^[a-z]$/i)) {
      return subsection.charCodeAt(0) - 97;
    }
    
    const numMatch = subsection.match(/^(\d+)([a-z])?$/i);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10) * 100;
      const letter = numMatch[2] ? numMatch[2].charCodeAt(0) - 97 : 0;
      return num + letter;
    }
    
    return 0;
  }
}

export default UniversalComplianceParser;

