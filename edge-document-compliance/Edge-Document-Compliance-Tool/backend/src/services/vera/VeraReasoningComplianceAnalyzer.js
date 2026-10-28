/**
 * VERA COMPLIANCE GAP ANALYZER - ENHANCED WITH REASONING
 * Uses deductive reasoning and semantic understanding instead of simple pattern matching
 * Integrates with VeraAdvancedReasoningEngine for intelligent gap analysis
 * Enhanced with concept-driven reasoning using knowledge graphs
 */

import { queryEdcatAI } from '../../config/databases.js';
import { KnowledgeGraphRepository } from './VeraRepository.js';
import VeraLogger from '../../../vera/utils/VeraLogger.js';

class VeraReasoningComplianceAnalyzer {
    constructor() {
        this.reasoningChain = [];
        this.deductions = [];
        this.confidenceThresholds = {
            explicit: 0.85,      // Direct match: "shall" statements found
            contextual: 0.70,    // Context clues suggest coverage
            ambiguous: 0.55,     // Could be covered but unclear
            likely_gap: 0.30,    // Probably not covered
            definite_gap: 0.10   // Clearly not covered
        };
        this.semanticPatterns = this.loadSemanticPatterns();
    }

    /**
     * Load semantic patterns for reasoning
     * Maps compliance concepts to real-world QMS procedures
     */
    loadSemanticPatterns() {
        return {
            // MANAGEMENT RESPONSIBILITY
            'management commitment': [
                'management review', 'leadership meeting', 'executive approval',
                'director sign-off', 'management decision', 'board approval'
            ],
            'organizational goals': [
                'strategic plan', 'objectives', 'targets', 'goals', 'vision',
                'mission statement', 'quality policy'
            ],
            'resource provision': [
                'budget allocation', 'staffing', 'equipment', 'tools',
                'training budget', 'capital expenditure', 'personnel assigned'
            ],

            // PROCESS MANAGEMENT
            'process planning': [
                'process map', 'procedure', 'flowchart', 'work instruction',
                'process documentation', 'standard operating procedure'
            ],
            'process control': [
                'quality control', 'inspection', 'testing', 'verification',
                'monitoring', 'measurement', 'audit'
            ],
            'process monitoring': [
                'KPI tracking', 'metrics', 'dashboard', 'data collection',
                'trending', 'performance indicators', 'monitoring system'
            ],

            // CHANGE MANAGEMENT
            'change control': [
                'change request', 'change board', 'change approval', 'impact analysis',
                'engineering change order', 'ECO', 'change management process',
                'change procedure', 'configuration control'
            ],
            'change evaluation': [
                'impact assessment', 'risk assessment', 'evaluation',
                'review', 'approval step', 'validation'
            ],

            // SUPPLIER MANAGEMENT
            'supplier evaluation': [
                'supplier assessment', 'vendor audit', 'supplier qualification',
                'approved supplier list', 'ASL', 'supplier approval', 'vendor review'
            ],
            'supplier monitoring': [
                'supplier audit', 'on-site audit', 'performance monitoring',
                'quality metrics', 'supplier scorecard', 'vendor review',
                'supplier performance tracking'
            ],

            // QUALITY ASSURANCE
            'quality planning': [
                'quality plan', 'quality control plan', 'QC plan', 'inspection plan',
                'testing strategy', 'verification plan'
            ],
            'nonconforming product': [
                'scrap', 'rework', 'NCR', 'nonconformance', 'defect',
                'rejection', 'quarantine', 'hold', 'disposition'
            ],
            'corrective action': [
                'CAPA', 'corrective and preventive action', 'root cause analysis',
                'RCA', 'corrective action plan', 'problem solving', 'action item'
            ],

            // DOCUMENTATION & RECORDS
            'document control': [
                'document procedure', 'document management', 'version control',
                'document approval', 'revision history', 'document distribution',
                'configuration management'
            ],
            'record keeping': [
                'record retention', 'data archive', 'filing system', 'record storage',
                'data management', 'backup', 'record control', 'retention schedule'
            ],

            // TRAINING & COMPETENCE
            'competence assessment': [
                'training', 'certification', 'qualification', 'skill assessment',
                'competency evaluation', 'knowledge test', 'proficiency check'
            ],
            'training program': [
                'training course', 'training schedule', 'training plan',
                'training record', 'training documentation', 'course curriculum'
            ],

            // INTERNAL AUDIT
            'internal audit': [
                'internal audit', 'self-assessment', 'management review',
                'internal inspection', 'compliance audit', 'process audit',
                'system audit', 'audit schedule'
            ],
            'audit follow-up': [
                'corrective action', 'audit finding', 'finding resolution',
                'follow-up audit', 'closure verification', 'action verification'
            ]
        };
    }

    /**
     * REASONING METHOD 1: Deductive Analysis
     * If customer has X, they likely also have Y
     * Based on real QMS knowledge
     */
    deductiveAnalysis(requirement, procedures) {
        const deduction = {
            requirement: requirement.text,
            clause: requirement.clauseNumber,
            reasoning: [],
            confidence: 0
        };

        // Extract requirement concept
        const concept = this.extractConcept(requirement.text);
        deduction.reasoning.push(`Concept: ${concept}`);

        // Find related procedures
        const relatedPatterns = this.semanticPatterns[concept] || [];
        deduction.reasoning.push(`Looking for patterns: ${relatedPatterns.join(', ')}`);

        let matchCount = 0;
        for (const pattern of relatedPatterns) {
            if (procedures.some(p => p.toLowerCase().includes(pattern.toLowerCase()))) {
                matchCount++;
                deduction.reasoning.push(`✓ Found: "${pattern}"`);
            }
        }

        // DEDUCTIVE REASONING:
        // If found 3+ patterns → likely covered (0.80+)
        // If found 1-2 patterns → possibly covered (0.65)
        // If found 0 patterns → likely gap (0.30)
        
        if (matchCount >= 3) {
            deduction.confidence = 0.88;
            deduction.reasoning.push('DEDUCTION: Multiple matching procedures found → LIKELY COVERED');
            deduction.coverageType = 'EXPLICIT';
        } else if (matchCount === 2) {
            deduction.confidence = 0.72;
            deduction.reasoning.push('DEDUCTION: Partial matching procedures found → POSSIBLY COVERED');
            deduction.coverageType = 'CONTEXTUAL';
        } else if (matchCount === 1) {
            deduction.confidence = 0.55;
            deduction.reasoning.push('DEDUCTION: Single matching procedure found → AMBIGUOUS (needs clarification)');
            deduction.coverageType = 'AMBIGUOUS';
        } else {
            deduction.confidence = 0.25;
            deduction.reasoning.push('DEDUCTION: No matching procedures found → LIKELY GAP');
            deduction.coverageType = 'GAP';
        }

        return deduction;
    }

    /**
     * REASONING METHOD 2: Contextual Reasoning
     * Look for indirect evidence of compliance
     * E.g., if they have "change board" → they have change control
     */
    contextualReasoning(requirement, allProcedures) {
        const context = {
            requirement: requirement.clauseNumber,
            directEvidenceFound: false,
            indirectEvidenceFound: [],
            implication: null,
            confidence: 0
        };

        // Check for direct "shall" statement
        const directMatch = allProcedures.some(p => 
            p.toLowerCase().includes(requirement.text.toLowerCase())
        );
        
        if (directMatch) {
            context.directEvidenceFound = true;
            context.confidence = 0.95;
            context.implication = 'Direct match found in procedures';
            return context;
        }

        // CONTEXTUAL REASONING:
        // If you have "change request form" → you have change control (even if not explicitly stated)
        // If you have "supplier audit" → you have supplier management
        // If you have "CAPA process" → you have corrective action
        
        const contextualClues = {
            'change control': ['change request', 'change form', 'change board', 'engineering change'],
            'supplier management': ['supplier audit', 'approved supplier', 'vendor', 'source inspection'],
            'corrective action': ['CAPA', 'root cause', 'problem solving', 'nonconformance'],
            'internal audit': ['audit', 'assessment', 'compliance check', 'process review'],
            'training': ['training', 'certification', 'qualification', 'competency']
        };

        for (const [concept, clues] of Object.entries(contextualClues)) {
            const foundClues = clues.filter(clue => 
                allProcedures.some(p => p.toLowerCase().includes(clue.toLowerCase()))
            );
            
            if (foundClues.length > 0) {
                context.indirectEvidenceFound.push({
                    concept: concept,
                    evidenceFound: foundClues
                });
            }
        }

        if (context.indirectEvidenceFound.length > 0) {
            context.confidence = 0.70;
            context.implication = `Indirect evidence: Customer has ${context.indirectEvidenceFound.map(e => e.concept).join(', ')}`;
        }

        return context;
    }

    /**
     * REASONING METHOD 3: Logical Inference
     * Based on hierarchical requirement relationships
     */
    logicalInference(requirement, allProcedures) {
        const inference = {
            clause: requirement.clauseNumber,
            parentRequirements: [],
            childRequirements: [],
            logicalChain: [],
            conclusion: null,
            confidence: 0
        };

        // Requirement hierarchies
        const hierarchies = {
            '4.4': ['4.4.1', '4.4.2'],      // If 4.4, likely have 4.4.1, 4.4.2
            '8.5': ['8.5.1', '8.5.2', '8.5.3'],  // Process control includes multiple aspects
            '9.1': ['9.1.1', '9.1.2'],     // Monitoring includes trending
            '10': ['10.1', '10.2', '10.3'] // Improvement includes CAPA, preventive
        };

        // LOGICAL CHAIN:
        // If they have "procedure" → they have "documented procedure" (parent)
        // If they have "management review" → they likely have "documented objectives" (implied parent)
        
        const clauseGroup = requirement.clauseNumber.split('.')[0];
        if (hierarchies[clauseGroup]) {
            inference.parentRequirements = hierarchies[clauseGroup];
            inference.logicalChain.push(`Clause ${requirement.clauseNumber} is part of requirement group ${clauseGroup}`);
            
            // Check if parent procedures exist
            const hasParentEvidence = allProcedures.some(p => 
                p.toLowerCase().includes('process') || 
                p.toLowerCase().includes('procedure') ||
                p.toLowerCase().includes('planning')
            );
            
            if (hasParentEvidence) {
                inference.confidence = 0.75;
                inference.conclusion = `Parent requirement group ${clauseGroup} has supporting procedures`;
            }
        }

        return inference;
    }

    /**
     * MAIN ANALYSIS METHOD: Integrates all reasoning methods
     */
    analyzeWithReasoning(requirements, procedures) {
        // Convert procedures to array of strings if needed
        const procedureTexts = Array.isArray(procedures) 
            ? procedures.map(p => typeof p === 'string' ? p : (p.text || p.procedureText || ''))
            : [procedures];
        
        const procedureTextArray = procedureTexts.join('\n').toLowerCase().split('\n').filter(p => p.trim());
        
        const results = {
            covered: [],
            ambiguous: [],
            gaps: [],
            reasoning: [],
            summary: {
                totalRequirements: requirements.length,
                coveredCount: 0,
                ambiguousCount: 0,
                gapCount: 0,
                averageConfidence: 0
            }
        };

        let totalConfidence = 0;

        for (const requirement of requirements) {
            // APPLY DEDUCTIVE REASONING
            const deduction = this.deductiveAnalysis(requirement, procedureTextArray);
            
            // APPLY CONTEXTUAL REASONING
            const context = this.contextualReasoning(requirement, procedureTextArray);
            
            // APPLY LOGICAL INFERENCE
            const inference = this.logicalInference(requirement, procedureTextArray);

            // COMBINE REASONING METHODS
            const finalConfidence = (deduction.confidence * 0.5) + (context.confidence * 0.3) + (inference.confidence * 0.2);
            
            const analysis = {
                clauseNumber: requirement.clauseNumber,
                requirementText: requirement.text,
                deductiveConfidence: deduction.confidence,
                contextualConfidence: context.confidence,
                inferenceConfidence: inference.confidence,
                finalConfidence: finalConfidence,
                coverageType: deduction.coverageType,
                reasoning: {
                    deductive: deduction.reasoning,
                    contextual: context.implication,
                    logical: inference.logicalChain
                }
            };

            totalConfidence += finalConfidence;

            // CLASSIFY BASED ON REASONING
            if (finalConfidence >= 0.80) {
                results.covered.push(analysis);
                results.reasoning.push(`✅ ${requirement.clauseNumber}: COVERED (confidence: ${(finalConfidence*100).toFixed(0)}%)`);
            } else if (finalConfidence >= 0.55) {
                results.ambiguous.push(analysis);
                results.reasoning.push(`⚠️  ${requirement.clauseNumber}: AMBIGUOUS (confidence: ${(finalConfidence*100).toFixed(0)}%) - needs clarification`);
            } else {
                results.gaps.push(analysis);
                results.reasoning.push(`❌ ${requirement.clauseNumber}: GAP (confidence: ${(finalConfidence*100).toFixed(0)}%)`);
            }
        }

        results.summary.coveredCount = results.covered.length;
        results.summary.ambiguousCount = results.ambiguous.length;
        results.summary.gapCount = results.gaps.length;
        results.summary.averageConfidence = (totalConfidence / requirements.length).toFixed(3);
        results.summary.coveragePercentage = ((results.covered.length / requirements.length) * 100).toFixed(1);
        results.summary.coveragePercentageDetailed = results.summary.coveragePercentage;

        // Add compatibility with existing format
        results.coveredRequirements = results.covered;
        results.ambiguousRequirements = results.ambiguous;
        results.gapRequirements = results.gaps;

        return results;
    }

    /**
     * Extract the main concept from a requirement (enhanced with knowledge graph lookup)
     * E.g., "The organization shall establish process control" → "process control"
     */
    async extractConceptFromKnowledgeGraph(requirementText, clauseNumber) {
        try {
            // Try to find concept in knowledge graph by clause number
            if (clauseNumber) {
                const conceptResult = await queryEdcatAI(
                    `SELECT c.* 
                     FROM edcat.vera_knowledge_graph_concepts c
                     JOIN edcat.vera_concept_relationships r ON r.concept_id_1 = c.concept_id OR r.concept_id_2 = c.concept_id
                     WHERE c.requirement_ids @> $1::text[]
                     LIMIT 1`,
                    [`["${clauseNumber}"]`]
                ).catch(() => ({ rows: [] }));

                if (conceptResult.rows && conceptResult.rows.length > 0) {
                    return conceptResult.rows[0];
                }
            }
        } catch (error) {
            // Fallback to local extraction
        }
        return null;
    }

    /**
     * Extract the main concept from a requirement
     * E.g., "The organization shall establish process control" → "process control"
     */
    extractConcept(requirementText) {
        const concepts = [
            'management commitment', 'organizational goals', 'resource provision',
            'process planning', 'process control', 'process monitoring',
            'change control', 'supplier evaluation', 'supplier monitoring',
            'nonconforming product', 'corrective action', 'document control',
            'record keeping', 'competence assessment', 'internal audit'
        ];

        const lower = requirementText.toLowerCase();
        for (const concept of concepts) {
            if (lower.includes(concept)) {
                return concept;
            }
        }

        // If no exact concept found, extract key noun
        const words = requirementText.split(/\s+/);
        return words.slice(-3).join(' ');
    }
}

    /**
     * Main analyze method - entry point for gap analysis
     * Enhanced with concept-driven reasoning using knowledge graphs
     */
    async analyze({ tenantId, userId, standardRequirements, customerProcedures, options = {} }) {
        const startTime = Date.now();
        const traceEnabled = process.env.VERA_TRACE_ENABLED === 'true' || options.traceEnabled === true;
        
        // Log reasoning start
        const context = {
            analysisId: options.analysisId || null,
            requirementCount: standardRequirements?.length || 0,
            procedureCount: customerProcedures?.length || 0,
            standardCode: options.standardCode || null,
            documentId: options.documentId || null
        };
        const trace = traceEnabled ? { steps: [], conceptsLoaded: [], proceduresConsidered: [] } : null;
        
        if (traceEnabled) {
            VeraLogger.logReasoningStart(context);
        }

        // Convert requirements and procedures to analysis format
        const requirements = Array.isArray(standardRequirements) 
            ? standardRequirements.map(req => ({
                clauseNumber: req.clause_number || req.clauseNumber,
                text: req.requirement_text || req.text || req.requirementText,
                id: req.id || req.requirement_id
            }))
            : [];

        const procedures = Array.isArray(customerProcedures)
            ? customerProcedures.map(proc => 
                typeof proc === 'string' ? proc : (proc.procedure_text || proc.text || proc.procedureText || '')
            )
            : [];

        if (traceEnabled && trace) {
            trace.proceduresConsidered = procedures.map((p, idx) => ({ index: idx, length: p.length }));
        }

        // Run reasoning-based analysis
        const reasoningResult = this.analyzeWithReasoning(requirements, procedures);

        // Enhance with concept-driven reasoning if knowledge graph is available
        const enhancedResult = await this.enhanceWithConceptReasoning(reasoningResult, requirements, procedures, tenantId, trace);
        
        const durationMs = Date.now() - startTime;
        
        if (traceEnabled) {
            VeraLogger.logReasoningEnd(context, {
                totalRequirements: requirements.length,
                gapsFound: enhancedResult.gaps.length,
                coveredFound: enhancedResult.covered.length,
                averageConfidence: enhancedResult.gaps.reduce((sum, g) => sum + (g.finalConfidence || 0), 0) / Math.max(enhancedResult.gaps.length, 1),
                durationMs
            });
        }

        // Calculate gap classification summary
        const gapSummary = {
            totalGaps: enhancedResult.gaps.length,
            criticalGaps: enhancedResult.gaps.filter(g => this.assessSeverity(g) === 'critical').length,
            majorGaps: enhancedResult.gaps.filter(g => this.assessSeverity(g) === 'major').length,
            minorGaps: enhancedResult.gaps.filter(g => this.assessSeverity(g) === 'minor').length,
            gapTypes: {},
            coveragePercentage: parseFloat(((enhancedResult.covered.length / requirements.length) * 100).toFixed(1))
        };
        
        if (traceEnabled) {
            VeraLogger.logGapClassificationSummary(gapSummary);
        }

        // Format for return
        return {
            summary: `Analyzed ${requirements.length} requirements. Found ${enhancedResult.gaps.length} gaps, ${enhancedResult.covered.length} covered, ${enhancedResult.ambiguous.length} ambiguous.`,
            gaps: enhancedResult.gaps.map(g => ({
                clauseNumber: g.clauseNumber,
                requirementText: g.requirementText,
                gapDescription: this.generateGapDescription(g),
                severity: this.assessSeverity(g),
                recommendation: this.generateRecommendation(g)
            })),
            coverage: {
                total: requirements.length,
                covered: enhancedResult.covered.length,
                partial: enhancedResult.ambiguous.length,
                gaps: enhancedResult.gaps.length,
                percentage: gapSummary.coveragePercentage
            },
            reasoning: enhancedResult.reasoning,
            trace: traceEnabled ? trace : undefined
        };
    }

    /**
     * Enhance analysis with concept-driven reasoning from knowledge graph
     */
    async enhanceWithConceptReasoning(baseResult, requirements, procedures, tenantId, trace = null) {
        try {
            // Try to load concepts from knowledge graph for each requirement
            for (const req of requirements) {
                const concept = this.extractConcept(req.text);
                
                if (trace) {
                    trace.conceptsLoaded.push({ requirementId: req.id, concept });
                }
                
                // Try to load concept from knowledge graph
                try {
                    const conceptResult = await queryEdcatAI(
                        `SELECT * FROM edcat.vera_knowledge_graph_concepts 
                         WHERE concept_name = $1 OR $2 = ANY(SELECT unnest(appears_in_standards))`,
                        [concept, concept]
                    ).catch(() => ({ rows: [] }));
                    
                    if (conceptResult.rows && conceptResult.rows.length > 0 && trace) {
                        trace.steps.push({
                            step: 'concept_loaded',
                            requirementId: req.id,
                            conceptId: conceptResult.rows[0].concept_id
                        });
                    }
                } catch (err) {
                    // Non-fatal
                }
            }
        } catch (error) {
            console.warn('[VeraReasoningComplianceAnalyzer] Concept reasoning enhancement failed:', error.message);
        }

        return baseResult;
    }

    /**
     * Generate gap description
     */
    generateGapDescription(analysis) {
        if (analysis.finalConfidence < 0.30) {
            return `No evidence found that this requirement is addressed in your procedures.`;
        }
        return `Limited evidence found. Confidence level: ${(analysis.finalConfidence * 100).toFixed(0)}%`;
    }

    /**
     * Assess gap severity
     */
    assessSeverity(analysis) {
        if (analysis.coverageType === 'GAP' || analysis.finalConfidence < 0.30) {
            // Check if clause is typically critical
            const criticalClauses = ['4.4', '5.1', '6.1', '8.3', '8.5', '9.1', '10.2'];
            const clausePrefix = analysis.clauseNumber?.split('.')[0] + '.' + (analysis.clauseNumber?.split('.')[1] || '');
            return criticalClauses.includes(clausePrefix) ? 'critical' : 'major';
        }
        return 'minor';
    }

    /**
     * Generate recommendation
     */
    generateRecommendation(analysis) {
        const concept = this.extractConcept(analysis.requirementText);
        return `Review your ${concept} procedures and ensure they address the requirement stated in clause ${analysis.clauseNumber}.`;
    }
}

// EXPORT FOR USE
const analyzerInstance = new VeraReasoningComplianceAnalyzer();
export default analyzerInstance;

