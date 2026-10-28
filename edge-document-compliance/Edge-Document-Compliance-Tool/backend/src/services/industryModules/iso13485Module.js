/**
 * ISO 13485 Medical Devices Module
 * Industry-specific logic for medical device compliance
 */

class ISO13485Module {
  constructor() {
    this.moduleCode = 'iso13485';
    this.moduleName = 'ISO 13485 Medical Devices';
    this.standards = ['ISO 13485:2016', 'FDA 21 CFR Part 820'];
  }

  getRequiredClauses() {
    return [
      '4.1', '4.2', '5.1', '5.2', '6.1', '6.2', '6.3', '6.4',
      '7.1', '7.2', '7.3', '7.4', '7.5', '7.6', '8.1', '8.2', '8.3', '8.4', '8.5'
    ];
  }

  getCriticalRequirements() {
    return {
      riskManagement: {
        required: true,
        standard: 'ISO 14971',
        description: 'Risk management for medical devices'
      },
      sterilization: {
        required: true,
        description: 'Sterilization process validation required'
      },
      designControls: {
        required: true,
        description: 'Design and development controls (FDA 21 CFR 820.30)'
      },
      traceability: {
        required: true,
        description: 'Device traceability (UDI, batch/lot tracking)'
      },
      clinicalEvaluation: {
        required: true,
        description: 'Clinical evaluation and post-market surveillance'
      }
    };
  }

  analyzeGap(gap, clause) {
    const analysis = {
      severity: gap.gap_severity || 'major',
      industrySpecific: true,
      recommendations: []
    };

    // ISO 13485 specific gap analysis
    if (clause.clause_number.startsWith('7.3')) {
      analysis.recommendations.push('Ensure design controls include risk management per ISO 14971');
      analysis.recommendations.push('Document design inputs, outputs, and verification/validation');
    }

    if (clause.clause_number.startsWith('7.5')) {
      analysis.recommendations.push('Establish production controls with validation');
      analysis.recommendations.push('Implement sterilization validation if applicable');
    }

    if (clause.clause_number.startsWith('8.2')) {
      analysis.recommendations.push('Maintain customer feedback and complaint handling');
      analysis.recommendations.push('Track adverse events and report to regulatory authorities');
    }

    return analysis;
  }

  generateProcedureTemplate(clause) {
    const templates = {
      '7.3': {
        title: 'Design and Development Control Procedure',
        sections: [
          'Design Planning',
          'Design Inputs',
          'Design Outputs',
          'Design Review',
          'Design Verification',
          'Design Validation',
          'Design Transfer',
          'Design Changes',
          'Risk Management Integration'
        ]
      },
      '7.5': {
        title: 'Production and Service Provision Procedure',
        sections: [
          'Production Controls',
          'Cleanliness and Contamination Control',
          'Installation Activities',
          'Servicing Activities',
          'Validation of Processes',
          'Identification and Traceability',
          'Customer Property',
          'Preservation of Product'
        ]
      }
    };

    const baseClause = clause.clause_number.split('.')[0] + '.' + clause.clause_number.split('.')[1];
    return templates[baseClause] || {
      title: `Procedure for ${clause.clause_number}`,
      sections: ['General Requirements', 'Responsibilities', 'Process Steps', 'Records']
    };
  }
}

export default ISO13485Module;

