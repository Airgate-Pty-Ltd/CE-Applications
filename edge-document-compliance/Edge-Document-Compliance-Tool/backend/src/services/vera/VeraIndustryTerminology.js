/**
 * Vera Industry Terminology Service
 * Detects industry context and injects industry-specific terminology into responses
 */

import { queryPostgres } from '../../database/connection.js';

class VeraIndustryTerminology {
  constructor() {
    this.industryPatterns = {
      aerospace: {
        standards: ['AS9100', 'AS9110', 'AS9120', 'AS9102', 'AS9103', 'FAA Part 21', 'FAA Part 145', 'EASA Part 145', 'ARP'],
        keywords: ['aerospace', 'aircraft', 'aviation', 'airframe', 'engine', 'propulsion', 'FAA', 'EASA', 'CAAC', 'configuration management', 'first article', 'key characteristics', 'special processes', 'counterfeit parts'],
        terminology: {
          'quality system': 'Quality Management System (QMS)',
          'inspection': 'First Article Inspection (FAI)',
          'change control': 'Configuration Management',
          'supplier': 'Approved Supplier',
          'nonconformity': 'Nonconformance',
          'corrective action': 'Corrective Action Request (CAR)',
          'preventive action': 'Preventive Action Request (PAR)',
          'audit': 'Quality System Audit',
          'document control': 'Configuration Control',
          'risk management': 'Risk-Based Thinking',
          'validation': 'Special Process Validation',
          'verification': 'Inspection and Test',
          'training': 'Competency and Qualification',
          'records': 'Quality Records',
          'management review': 'Management Review',
          'design': 'Design and Development',
          'purchasing': 'Purchasing and Supplier Management',
          'production': 'Production and Service Provision',
          'monitoring': 'Monitoring and Measurement',
          'improvement': 'Continual Improvement'
        },
        acronyms: {
          'FAI': 'First Article Inspection',
          'CAR': 'Corrective Action Request',
          'PAR': 'Preventive Action Request',
          'ASL': 'Approved Supplier List',
          'CM': 'Configuration Management',
          'KC': 'Key Characteristics',
          'SP': 'Special Processes',
          'CPP': 'Counterfeit Parts Prevention',
          'ODA': 'Organization Designation Authorization',
          'PMA': 'Parts Manufacturer Approval',
          'TSO': 'Technical Standard Order'
        }
      },
      medical_devices: {
        standards: ['ISO 13485', 'ISO 14971', 'FDA 21 CFR Part 820', 'EU MDR', 'IVDR', 'MDSAP', 'FDA 21 CFR Part 11'],
        keywords: ['medical device', 'med device', 'FDA', 'MDR', 'IVDR', 'clinical', 'biocompatibility', 'sterilization', 'validation', 'verification', 'design controls', 'risk management', 'post-market', 'adverse event'],
        terminology: {
          'quality system': 'Quality Management System (QMS)',
          'inspection': 'Inspection and Test',
          'change control': 'Design Change Control',
          'supplier': 'Supplier/Service Provider',
          'nonconformity': 'Nonconformity',
          'corrective action': 'Corrective and Preventive Action (CAPA)',
          'preventive action': 'Preventive Action',
          'audit': 'Quality System Audit',
          'document control': 'Document and Record Control',
          'risk management': 'Risk Management (ISO 14971)',
          'validation': 'Process Validation',
          'verification': 'Design Verification',
          'training': 'Training and Competence',
          'records': 'Quality Records',
          'management review': 'Management Review',
          'design': 'Design and Development',
          'purchasing': 'Purchasing',
          'production': 'Production and Service Provision',
          'monitoring': 'Monitoring and Measurement',
          'improvement': 'Continual Improvement'
        },
        acronyms: {
          'CAPA': 'Corrective and Preventive Action',
          'DHF': 'Design History File',
          'DMR': 'Device Master Record',
          'DHR': 'Device History Record',
          'FMEA': 'Failure Mode and Effects Analysis',
          'HACCP': 'Hazard Analysis and Critical Control Points',
          'MDSAP': 'Medical Device Single Audit Program',
          'PMS': 'Post-Market Surveillance',
          'PMCF': 'Post-Market Clinical Follow-up',
          'UDI': 'Unique Device Identification',
          'SOP': 'Standard Operating Procedure',
          'QSR': 'Quality System Regulation (21 CFR Part 820)',
          'ALCOA': 'Attributable, Legible, Contemporaneous, Original, Accurate',
          'ALCOA+': 'ALCOA + Complete, Consistent, Enduring, Available'
        }
      },
      automotive: {
        standards: ['IATF 16949', 'ISO 9001', 'APQP', 'PPAP', 'FMEA', 'SPC', 'MSA'],
        keywords: ['automotive', 'IATF', 'APQP', 'PPAP', 'FMEA', 'SPC', 'MSA', 'automotive supplier', 'OEM', 'tier', 'customer specific'],
        terminology: {
          'quality system': 'Quality Management System (QMS)',
          'inspection': 'Inspection and Test',
          'change control': 'Engineering Change Management',
          'supplier': 'Supplier/Subcontractor',
          'nonconformity': 'Nonconformity',
          'corrective action': 'Corrective Action',
          'preventive action': 'Preventive Action',
          'audit': 'Quality System Audit',
          'document control': 'Document and Record Control',
          'risk management': 'Risk-Based Thinking',
          'validation': 'Process Validation',
          'verification': 'Product Verification',
          'training': 'Training and Competence',
          'records': 'Quality Records',
          'management review': 'Management Review',
          'design': 'Product Design and Development',
          'purchasing': 'Purchasing',
          'production': 'Production and Service Provision',
          'monitoring': 'Monitoring and Measurement',
          'improvement': 'Continual Improvement'
        },
        acronyms: {
          'APQP': 'Advanced Product Quality Planning',
          'PPAP': 'Production Part Approval Process',
          'FMEA': 'Failure Mode and Effects Analysis',
          'SPC': 'Statistical Process Control',
          'MSA': 'Measurement System Analysis',
          'CPK': 'Process Capability Index',
          'PPK': 'Process Performance Index',
          'OEM': 'Original Equipment Manufacturer',
          'Tier 1': 'Tier 1 Supplier',
          'Tier 2': 'Tier 2 Supplier',
          'CSR': 'Customer-Specific Requirements',
          'QOS': 'Quality Operating System',
          'LPA': 'Layered Process Audit',
          '8D': '8 Disciplines Problem Solving'
        }
      },
      general: {
        standards: ['ISO 9001', 'ISO 14001', 'ISO 45001', 'ISO 27001'],
        keywords: ['quality', 'management system', 'ISO', 'compliance'],
        terminology: {},
        acronyms: {
          'QMS': 'Quality Management System',
          'EMS': 'Environmental Management System',
          'OHSMS': 'Occupational Health and Safety Management System',
          'ISMS': 'Information Security Management System',
          'CAPA': 'Corrective and Preventive Action',
          'PDCA': 'Plan-Do-Check-Act',
          'SOP': 'Standard Operating Procedure',
          'WI': 'Work Instruction',
          'NC': 'Nonconformity',
          'OFI': 'Opportunity for Improvement'
        }
      }
    };
  }

  /**
   * Detect industry from standards and documents
   */
  detectIndustry(context) {
    const { standards = [], documents = [] } = context;
    const allText = [
      ...standards.map(s => `${s.code} ${s.name || ''} ${s.sector || ''} ${s.file_category || ''}`).join(' '),
      ...documents.map(d => `${d.name || ''} ${d.type || ''}`).join(' ')
    ].join(' ').toLowerCase();

    const industryScores = {
      aerospace: 0,
      medical_devices: 0,
      automotive: 0,
      general: 0
    };

    // Check standards
    for (const standard of standards) {
      const code = (standard.code || '').toLowerCase();
      const name = (standard.name || '').toLowerCase();
      const sector = (standard.sector || '').toLowerCase();
      const category = (standard.file_category || '').toLowerCase();

      for (const [industry, patterns] of Object.entries(this.industryPatterns)) {
        if (industry === 'general') continue;
        
        // Check standard codes
        for (const stdPattern of patterns.standards) {
          if (code.includes(stdPattern.toLowerCase()) || name.includes(stdPattern.toLowerCase())) {
            industryScores[industry] += 3;
          }
        }

        // Check sector/category
        if (sector.includes(industry) || category.includes(industry)) {
          industryScores[industry] += 2;
        }
      }
    }

    // Check keywords in all text
    for (const [industry, patterns] of Object.entries(this.industryPatterns)) {
      if (industry === 'general') continue;
      for (const keyword of patterns.keywords) {
        if (allText.includes(keyword.toLowerCase())) {
          industryScores[industry] += 1;
        }
      }
    }

    // Find highest scoring industry
    let maxScore = 0;
    let detectedIndustry = 'general';
    for (const [industry, score] of Object.entries(industryScores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedIndustry = industry;
      }
    }

    return {
      industry: detectedIndustry,
      confidence: maxScore > 0 ? Math.min(1.0, maxScore / 10) : 0.5,
      scores: industryScores
    };
  }

  /**
   * Enhance text with industry-specific terminology
   */
  enhanceWithTerminology(text, industry) {
    if (!text || !industry || industry === 'general') {
      return text;
    }

    const patterns = this.industryPatterns[industry];
    if (!patterns) return text;

    let enhanced = text;

    // Replace generic terms with industry-specific terminology
    for (const [generic, specific] of Object.entries(patterns.terminology)) {
      // Case-insensitive replacement, but preserve original case
      const regex = new RegExp(`\\b${generic}\\b`, 'gi');
      enhanced = enhanced.replace(regex, (match) => {
        // Preserve original capitalization
        if (match === match.toUpperCase()) {
          return specific.toUpperCase();
        } else if (match === match.toLowerCase()) {
          return specific.toLowerCase();
        } else if (match[0] === match[0].toUpperCase()) {
          return specific.charAt(0).toUpperCase() + specific.slice(1);
        }
        return specific;
      });
    }

    // Expand acronyms on first use
    const acronymsUsed = new Set();
    for (const [acronym, expansion] of Object.entries(patterns.acronyms)) {
      // Only expand if acronym appears and hasn't been expanded yet
      const regex = new RegExp(`\\b${acronym}\\b`, 'gi');
      if (regex.test(enhanced) && !acronymsUsed.has(acronym)) {
        // Check if already expanded (contains expansion)
        if (!enhanced.includes(expansion)) {
          // Replace first occurrence with "ACRONYM (Expansion)"
          enhanced = enhanced.replace(regex, (match, offset) => {
            if (acronymsUsed.has(acronym)) return match;
            acronymsUsed.add(acronym);
            return `${match} (${expansion})`;
          });
        }
      }
    }

    return enhanced;
  }

  /**
   * Get industry-specific context for responses
   */
  getIndustryContext(industry) {
    if (!industry || industry === 'general' || !this.industryPatterns[industry]) {
      return null;
    }

    const patterns = this.industryPatterns[industry];
    return {
      industry,
      keyStandards: patterns.standards,
      criticalAreas: patterns.terminology ? Object.values(patterns.terminology).slice(0, 5) : [],
      commonAcronyms: patterns.acronyms
    };
  }

  /**
   * Add industry-specific examples or suggestions to response
   */
  addIndustryExamples(response, industry, topic) {
    if (!industry || industry === 'general') {
      return response;
    }

    const patterns = this.industryPatterns[industry];
    if (!patterns) return response;

    // Add industry-specific examples based on topic
    if (topic && topic.toLowerCase().includes('gap')) {
      const examples = this.getGapAnalysisExamples(industry);
      if (examples) {
        response += `\n\n**${industry.charAt(0).toUpperCase() + industry.slice(1).replace('_', ' ')}-Specific Examples:**\n`;
        examples.forEach(example => {
          response += `• ${example}\n`;
        });
      }
    }

    return response;
  }

  /**
   * Get industry-specific gap analysis examples
   */
  getGapAnalysisExamples(industry) {
    const examples = {
      aerospace: [
        'Configuration management procedures missing key characteristics identification',
        'First Article Inspection (FAI) process not documented per AS9102',
        'Special processes validation missing for heat treatment or welding',
        'Counterfeit parts prevention program not addressing supply chain controls',
        'Key characteristics management not integrated into design and production'
      ],
      medical_devices: [
        'Design controls missing risk management integration (ISO 14971)',
        'Post-market surveillance procedures not addressing adverse event reporting',
        'Process validation missing for sterilization or packaging',
        'Software validation not following IEC 62304 requirements',
        'Clinical evaluation documentation incomplete per EU MDR'
      ],
      automotive: [
        'APQP (Advanced Product Quality Planning) process not documented',
        'PPAP (Production Part Approval Process) missing customer-specific requirements',
        'FMEA (Failure Mode and Effects Analysis) not updated for design changes',
        'SPC (Statistical Process Control) implementation missing for key processes',
        'Customer-specific requirements not integrated into QMS'
      ]
    };

    return examples[industry] || null;
  }
}

export default new VeraIndustryTerminology();

