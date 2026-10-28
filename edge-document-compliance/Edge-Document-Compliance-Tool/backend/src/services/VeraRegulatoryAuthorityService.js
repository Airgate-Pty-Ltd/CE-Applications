/**
 * Vera Regulatory Authority Service
 * Know the differences between FAA, EASA, CASA, FDA, etc.
 * Provides authority profiles, comparisons, and compliance strategies
 */

import { queryPostgres, queryEdcatAI } from '../config/databases.js';

const VeraRegulatoryAuthorityService = {

  /**
   * Get authority profile
   * Who sets this regulation? What's their focus? What do they care about?
   */
  getAuthorityProfile(authorityCode) {
    const profiles = {
      'FAA': {
        full_name: 'Federal Aviation Administration (USA)',
        focus: 'Aviation safety, Part 21 (manufacturing), Part 145 (repair stations)',
        key_concerns: [
          'Airworthiness—is the aircraft safe to fly?',
          'Configuration control—every change is tracked',
          'Traceability—can we prove where every part came from?',
          'Counterfeit prevention—parts must be authentic',
          'Foreign object debris—critical for engines',
          'Document retention—7 years minimum'
        ],
        philosophy: 'Prescriptive—detailed rules you must follow',
        audit_style: 'Thorough, focused on evidence trails, wants to see everything documented',
        common_findings: [
          'Inadequate configuration management',
          'Poor traceability records',
          'Insufficient counterfeit part controls',
          'Weak supplier surveillance'
        ],
        equivalent_standards: ['AS9100', 'AS9102', 'AS9110'],
        differs_from: {
          'EASA': 'FAA is USA-centric, EASA covers Europe. EASA is slightly more flexible on alternatives.',
          'CASA': 'CASA follows similar principles but allows more autonomy to suppliers',
          'CAAC': 'CAAC (China) mirrors FAA but is less documented'
        }
      },

      'EASA': {
        full_name: 'European Aviation Safety Agency',
        focus: 'European aviation certification, Part-21 manufacturing',
        key_concerns: [
          'Airworthiness—European perspective on safety',
          'Environmental compliance—EU regulations',
          'Configuration management—similar to FAA but allows alternatives',
          'Traceability—required but slightly more flexible',
          'Quality management system—risk-based approach',
          'Management review—emphasis on continuous improvement'
        ],
        philosophy: 'Principles-based—rules with flexibility for alternatives',
        audit_style: 'Collaborative, interested in your management system thinking',
        common_findings: [
          'Inadequate risk assessment',
          'Weak management review process',
          'Insufficient alternative approaches documented',
          'Poor effectiveness of controls'
        ],
        equivalent_standards: ['AS9100', 'ISO 9001 with special requirements'],
        differs_from: {
          'FAA': 'More flexible on alternatives, emphasizes continuous improvement',
          'CASA': 'EASA is stricter on environmental aspects',
          'FAA Part 145': 'Repair is MORE controlled under EASA than FAA'
        }
      },

      'CASA': {
        full_name: 'Civil Aviation Safety Authority (Australia)',
        focus: 'Australian and regional aviation safety, Part 21, Part 145',
        key_concerns: [
          'Airworthiness—same as FAA but more accessible to SMEs',
          'Configuration control—required',
          'Traceability—required',
          'Counterfeit prevention—required',
          'Supply chain management—emphasis on relationships'
        ],
        philosophy: 'Principles-based with industry engagement',
        audit_style: 'Consultative—works with industry to understand challenges',
        common_findings: [
          'Weak supplier management',
          'Insufficient documentation of decisions',
          'Inadequate risk assessment'
        ],
        equivalent_standards: ['AS9100', 'Part 21/145 requirements'],
        differs_from: {
          'FAA': 'Less prescriptive, more focused on outcome',
          'EASA': 'Similar principles, CASA is more SME-friendly'
        }
      },

      'FDA': {
        full_name: 'Food and Drug Administration (USA)',
        focus: 'Medical devices, pharmaceuticals, food safety',
        key_concerns: [
          'Patient safety—primary focus',
          'Design controls—for medical devices',
          'Risk management—per ISO 14971',
          'Traceability—especially for recalls',
          '510(k) or PMA submissions—proof of safety/efficacy',
          'Post-market surveillance—ongoing safety monitoring'
        ],
        philosophy: 'Risk-based regulatory approach',
        audit_style: 'Inspection-focused, looking for GMP compliance',
        common_findings: [
          'Inadequate design controls',
          'Weak risk management documentation',
          'Poor traceability',
          'Insufficient management review'
        ],
        equivalent_standards: ['ISO 13485', 'FDA 21 CFR Part 11', 'ISO 14971'],
        differs_from: {
          'EASA': 'Completely different industry (medical vs aerospace)',
          'FAA': 'Different industry, different focus (safety vs efficacy)'
        }
      },

      'EU-MDR': {
        full_name: 'European Union Medical Device Regulation',
        focus: 'Medical device regulation in EU (more stringent than FDA)',
        key_concerns: [
          'Clinical evaluation—stronger than FDA',
          'Post-market surveillance—more rigorous',
          'Notified body involvement—independent review',
          'Post-market data—continuous monitoring',
          'Safety updates—more conservative',
          'EU specific requirements—stricter than FDA in some areas'
        ],
        philosophy: 'Precautionary principle—prove safety before market',
        audit_style: 'Notified body audits are more rigorous than FDA',
        common_findings: [
          'Weak clinical evaluation',
          'Insufficient post-market data',
          'Poor management of alerts'
        ],
        equivalent_standards: ['ISO 13485 (plus EU-MDR additions)', 'ISO 14971'],
        differs_from: {
          'FDA': 'EU-MDR is stricter on clinical evidence, post-market surveillance'
        }
      },

      'ISO': {
        full_name: 'International Organization for Standardization',
        focus: 'Voluntary international standards',
        key_concerns: [
          'Quality management system—ISO 9001',
          'Continuous improvement—risk-based approach',
          'Customer focus—understanding needs',
          'Process approach—understanding interactions',
          'Management responsibility—leadership commitment',
          'Competence—people and training'
        ],
        philosophy: 'Principles-based framework, adaptable to context',
        audit_style: 'Certification audits check compliance to standard',
        common_findings: [
          'Inadequate top management engagement',
          'Weak context analysis',
          'Poor risk assessment',
          'Insufficient effectiveness checks'
        ],
        equivalent_standards: ['Industry-specific: AS9100, ISO 13485, ISO 22000'],
        differs_from: {
          'FAA': 'ISO is voluntary, FAA is mandatory. ISO provides framework, FAA prescribes details.',
          'EASA': 'EASA adopts ISO thinking but adds specific requirements',
          'FDA': 'FDA aligns with ISO 13485 for medical devices'
        }
      }
    };

    return profiles[authorityCode] || null;
  },

  /**
   * Compare two regulatory authorities
   * "How does FAA Part 21 differ from EASA Part-21?"
   */
  compareAuthorities(authority1Code, authority2Code) {
    const profile1 = this.getAuthorityProfile(authority1Code);
    const profile2 = this.getAuthorityProfile(authority2Code);

    if (!profile1 || !profile2) return null;

    return {
      authority1: {
        code: authority1Code,
        name: profile1.full_name,
        philosophy: profile1.philosophy,
        focus: profile1.focus,
        key_concerns: profile1.key_concerns.slice(0, 5)
      },
      authority2: {
        code: authority2Code,
        name: profile2.full_name,
        philosophy: profile2.philosophy,
        focus: profile2.focus,
        key_concerns: profile2.key_concerns.slice(0, 5)
      },
      similarities: this.findAuthoritySimilarities(profile1, profile2),
      key_differences: this.findAuthorityDifferences(profile1, profile2),
      compliance_strategy: this.getComplianceStrategy(authority1Code, authority2Code),
      audit_expectations: this.compareAuditExpectations(profile1, profile2)
    };
  },

  /**
   * Find similarities between authorities
   */
  findAuthoritySimilarities(profile1, profile2) {
    const similarities = [];

    // Check if they share key concerns
    const concerns1 = new Set(profile1.key_concerns.map(c => c.toLowerCase()));
    const concerns2 = new Set(profile2.key_concerns.map(c => c.toLowerCase()));

    const shared = [...concerns1].filter(c => 
      [...concerns2].some(c2 => c.includes(c2.split('—')[0]) || c2.includes(c.split('—')[0]))
    );

    if (shared.length > 0) {
      similarities.push(`Both focus on: ${shared.slice(0, 2).join(', ')}`);
    }

    // Check equivalent standards
    const equiv1 = new Set(profile1.equivalent_standards || []);
    const equiv2 = new Set(profile2.equivalent_standards || []);
    const sharedEquiv = [...equiv1].filter(e => equiv2.has(e));

    if (sharedEquiv.length > 0) {
      similarities.push(`Both adopt: ${sharedEquiv.join(', ')}`);
    }

    return similarities.length > 0 ? similarities : ['Both require quality management systems'];
  },

  /**
   * Find key differences
   */
  findAuthorityDifferences(profile1, profile2) {
    const differences = [];

    if (profile1.philosophy !== profile2.philosophy) {
      differences.push(`Philosophy: ${profile1.philosophy} vs ${profile2.philosophy}`);
    }

    if (profile1.audit_style !== profile2.audit_style) {
      differences.push(`Audit approach: ${profile1.audit_style} vs ${profile2.audit_style}`);
    }

    // Identify unique concerns
    const unique1 = profile1.key_concerns
      .filter(c1 => !profile2.key_concerns.some(c2 => c1.includes(c2.split('—')[0])))
      .slice(0, 2);

    const unique2 = profile2.key_concerns
      .filter(c2 => !profile1.key_concerns.some(c1 => c2.includes(c1.split('—')[0])))
      .slice(0, 2);

    if (unique1.length > 0) {
      differences.push(`${profile1.full_name} emphasizes: ${unique1[0].split('—')[0]}`);
    }

    if (unique2.length > 0) {
      differences.push(`${profile2.full_name} emphasizes: ${unique2[0].split('—')[0]}`);
    }

    return differences;
  },

  /**
   * Get compliance strategy for meeting both requirements
   */
  getComplianceStrategy(authority1Code, authority2Code) {
    const strategies = {
      'FAA-EASA': {
        approach: 'Design to FAA (stricter), verify against EASA',
        focus_areas: [
          'Configuration management—meet FAA rigor, EASA will accept',
          'Traceability—meet FAA detail level',
          'Alternative approaches—document for EASA flexibility'
        ]
      },
      'FAA-CASA': {
        approach: 'Meet FAA, validate for CASA SME consideration',
        focus_areas: [
          'Configuration control—same rigor',
          'Supplier management—emphasis on relationships for CASA'
        ]
      },
      'EASA-EU-MDR': {
        approach: 'Medical device in EU: meet EU-MDR, EASA for components',
        focus_areas: [
          'Clinical evaluation (medical)',
          'Configuration (aerospace)'
        ]
      },
      'FDA-EU-MDR': {
        approach: 'Design to EU-MDR (stricter), FDA will accept',
        focus_areas: [
          'Clinical data—meet EU-MDR standard',
          'Post-market surveillance—EU-MDR rigor',
          'Notified body coordination'
        ]
      },
      'default': {
        approach: 'Meet the more stringent requirement',
        focus_areas: [
          'Identify stricter authority',
          'Design to that standard',
          'Map to secondary authority'
        ]
      }
    };

    const key = `${authority1Code}-${authority2Code}`;
    const reverseKey = `${authority2Code}-${authority1Code}`;

    return strategies[key] || strategies[reverseKey] || strategies.default;
  },

  /**
   * Compare audit expectations between authorities
   */
  compareAuditExpectations(profile1, profile2) {
    return {
      finding_severity: {
        [profile1.full_name]: profile1.common_findings.slice(0, 3),
        [profile2.full_name]: profile2.common_findings.slice(0, 3)
      },
      audit_intensity: {
        profile1: profile1.audit_style,
        profile2: profile2.audit_style
      },
      preparation_focus: [
        `For ${profile1.full_name}: ${profile1.audit_style}`,
        `For ${profile2.full_name}: ${profile2.audit_style}`
      ]
    };
  }
};

export default VeraRegulatoryAuthorityService;

