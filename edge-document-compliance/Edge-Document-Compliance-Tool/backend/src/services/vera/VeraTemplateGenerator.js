/**
 * Vera Template Generator
 *
 * Generates procedure templates dynamically from approved examples.
 * Analyzes multiple examples to extract common patterns, sections, and phrasing.
 *
 * 100% internal - no external LLM calls.
 */
export class VeraTemplateGenerator {
    /**
     * Generate template from approved examples
     */
    static generateTemplateFromExamples(standardCode, clauseRef, examples) {
        if (examples.length === 0) {
            return this.generateGenericTemplate(standardCode, clauseRef);
        }
        // Analyze examples to extract patterns
        const sections = this.extractSections(examples);
        const commonPhrases = this.extractCommonPhrases(examples);
        const estimatedLength = this.estimateLength(examples);
        return {
            standardCode,
            clauseRef,
            sections: sections.sort((a, b) => a.order - b.order),
            commonPhrases,
            estimatedLength
        };
    }
    /**
     * Extract section headings from examples
     * ITERATION 9: Enhanced pattern extraction
     */
    static extractSections(examples) {
        const sectionMap = new Map();
        for (const example of examples) {
            const content = example.content_text;
            const sections = this.parseSections(content);
            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                const normalizedName = this.normalizeSectionName(section.name);
                if (!sectionMap.has(normalizedName)) {
                    sectionMap.set(normalizedName, {
                        count: 0,
                        orders: [],
                        phrases: [],
                        samples: [],
                        headings: []
                    });
                }
                const entry = sectionMap.get(normalizedName);
                entry.count++;
                entry.orders.push(i);
                entry.phrases.push(...this.extractPhrases(section.content));
                entry.samples.push(section.content.substring(0, 200));
                entry.headings.push(section.name);
                // Enhanced: Extract common phrases and structures
                const commonStructures = this.extractCommonStructures(section.content);
                entry.phrases.push(...commonStructures);
            }
        }
        // Convert to TemplateSection array
        const sections = [];
        const avgOrder = (orders) => orders.reduce((a, b) => a + b, 0) / orders.length;
        for (const [name, data] of sectionMap.entries()) {
            const order = Math.round(avgOrder(data.orders));
            const mostCommonPhrase = this.findMostCommonPhrase(data.phrases);
            const mostCommonHeading = this.findMostCommonPhrase(data.headings || [name]);
            const placeholder = this.generatePlaceholder(mostCommonHeading || name, mostCommonPhrase, data.samples[0]);
            sections.push({
                name,
                order,
                placeholderText: placeholder,
                required: data.count >= examples.length * 0.7, // Required if in 70%+ of examples
                commonPhrases: data.phrases.slice(0, 3)
            });
        }
        return sections;
    }
    /**
     * Parse sections from document content
     */
    static parseSections(content) {
        const sections = [];
        // Common section heading patterns
        const headingPatterns = [
            /^(?:1\.|2\.|3\.|4\.|5\.|6\.|7\.|8\.|9\.|10\.)\s+([A-Z][A-Z\s]+?)(?:\n|$)/gm,
            /^(?:PURPOSE|SCOPE|RESPONSIBILITY|RESPONSIBILITIES|PROCEDURE|PROCESS|RECORDS|DEFINITIONS|REFERENCES)(?:\s|:)/gmi,
            /^([A-Z][A-Z\s]{3,30})(?:\n|$)/gm
        ];
        let lastIndex = 0;
        let lastHeading = 'Introduction';
        for (const pattern of headingPatterns) {
            const matches = Array.from(content.matchAll(pattern));
            for (const match of matches) {
                if (match.index !== undefined && match.index > lastIndex) {
                    // Save previous section
                    if (lastIndex > 0) {
                        sections.push({
                            name: lastHeading,
                            content: content.substring(lastIndex, match.index).trim()
                        });
                    }
                    lastHeading = match[1] || match[0].trim();
                    lastIndex = match.index + match[0].length;
                }
            }
        }
        // Add final section
        if (lastIndex < content.length) {
            sections.push({
                name: lastHeading,
                content: content.substring(lastIndex).trim()
            });
        }
        // If no sections found, create one
        if (sections.length === 0) {
            sections.push({
                name: 'Procedure',
                content: content
            });
        }
        return sections;
    }
    /**
     * Normalize section name
     */
    static normalizeSectionName(name) {
        return name
            .toUpperCase()
            .replace(/[^\w\s]/g, '')
            .trim()
            .replace(/\s+/g, ' ');
    }
    /**
     * Extract common structures from content (ITERATION 9 enhancement)
     */
    static extractCommonStructures(content) {
        const structures = [];
        // Extract numbered/bulleted lists
        const listPattern = /(?:^|\n)(?:\d+\.|\-|\*|\•)\s+([^\n]+)/gm;
        const lists = Array.from(content.matchAll(listPattern));
        if (lists.length > 0) {
            structures.push('List format: ' + lists.slice(0, 2).map(m => m[1].substring(0, 30)).join('; '));
        }
        // Extract table-like structures
        if (content.includes('|') || content.match(/\t/)) {
            structures.push('Table or structured data format');
        }
        // Extract common sentence patterns
        const sentencePatterns = [
            /(?:The|This|These)\s+\w+\s+(?:shall|must|should|will)\s+[^.]{10,50}\./g,
            /(?:All|Each|Every)\s+\w+\s+(?:shall|must|should)\s+[^.]{10,50}\./g
        ];
        for (const pattern of sentencePatterns) {
            const matches = content.match(pattern);
            if (matches && matches.length > 0) {
                structures.push('Requirement pattern: ' + matches[0].substring(0, 50));
            }
        }
        return structures;
    }
    /**
     * Extract phrases from content
     */
    static extractPhrases(content) {
        const phrases = [];
        // Extract sentences
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
        for (const sentence of sentences.slice(0, 5)) {
            // Extract key phrases (remove common words)
            const words = sentence.toLowerCase().split(/\s+/);
            const keyWords = words.filter(w => w.length > 4 &&
                !['the', 'this', 'that', 'with', 'from', 'into', 'shall', 'will', 'must'].includes(w));
            if (keyWords.length >= 3) {
                phrases.push(keyWords.slice(0, 5).join(' '));
            }
        }
        return phrases;
    }
    /**
     * Find most common phrase
     */
    static findMostCommonPhrase(phrases) {
        const counts = new Map();
        for (const phrase of phrases) {
            counts.set(phrase, (counts.get(phrase) || 0) + 1);
        }
        let maxCount = 0;
        let mostCommon = '';
        for (const [phrase, count] of counts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = phrase;
            }
        }
        return mostCommon || phrases[0] || '';
    }
    /**
     * Generate placeholder text for a section
     */
    static generatePlaceholder(sectionName, commonPhrase, sample) {
        const placeholders = {
            'PURPOSE': 'Describe the purpose of this procedure in relation to [STANDARD_CODE] [CLAUSE_REF].',
            'SCOPE': 'Define the scope and applicability of this procedure.',
            'RESPONSIBILITY': 'Identify the roles and responsibilities for this procedure.',
            'PROCEDURE': 'Describe the step-by-step process to be followed.',
            'RECORDS': 'Specify what records must be maintained and where they are stored.',
            'DEFINITIONS': 'Define any terms or acronyms used in this procedure.',
            'REFERENCES': 'List related documents, standards, or procedures.'
        };
        const normalized = sectionName.toUpperCase();
        if (placeholders[normalized]) {
            return placeholders[normalized];
        }
        // Generate from sample
        if (sample && sample.length > 50) {
            const firstSentence = sample.split(/[.!?]/)[0];
            if (firstSentence.length > 30 && firstSentence.length < 200) {
                return firstSentence.replace(/\[.*?\]/g, '[ORGANIZATION]').substring(0, 150);
            }
        }
        return `Describe ${sectionName.toLowerCase()} for this procedure.`;
    }
    /**
     * Extract common phrases across examples
     */
    static extractCommonPhrases(examples) {
        const phraseCounts = new Map();
        for (const example of examples) {
            const phrases = this.extractPhrases(example.content_text);
            for (const phrase of phrases) {
                phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
            }
        }
        // Return phrases that appear in at least 2 examples
        const common = [];
        for (const [phrase, count] of phraseCounts.entries()) {
            if (count >= 2 && phrase.length > 10) {
                common.push(phrase);
            }
        }
        return common.slice(0, 10).sort((a, b) => (phraseCounts.get(b) || 0) - (phraseCounts.get(a) || 0));
    }
    /**
     * Estimate template length
     */
    static estimateLength(examples) {
        if (examples.length === 0)
            return 1000;
        const lengths = examples.map(e => e.content_text.length);
        const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        return Math.round(avg * 0.8); // 80% of average as estimate
    }
    /**
     * Generate generic template when no examples available
     */
    static generateGenericTemplate(standardCode, clauseRef) {
        return {
            standardCode,
            clauseRef,
            sections: [
                {
                    name: 'Purpose',
                    order: 1,
                    placeholderText: `Describe the purpose of this procedure in relation to ${standardCode}${clauseRef ? ` clause ${clauseRef}` : ''}.`,
                    required: true,
                    commonPhrases: []
                },
                {
                    name: 'Scope',
                    order: 2,
                    placeholderText: 'Define the scope and applicability of this procedure.',
                    required: true,
                    commonPhrases: []
                },
                {
                    name: 'Responsibilities',
                    order: 3,
                    placeholderText: 'Identify the roles and responsibilities for this procedure.',
                    required: true,
                    commonPhrases: []
                },
                {
                    name: 'Procedure',
                    order: 4,
                    placeholderText: 'Describe the step-by-step process to be followed.',
                    required: true,
                    commonPhrases: []
                },
                {
                    name: 'Records',
                    order: 5,
                    placeholderText: 'Specify what records must be maintained and where they are stored.',
                    required: false,
                    commonPhrases: []
                }
            ],
            commonPhrases: [],
            estimatedLength: 1500
        };
    }
    /**
     * Format template as markdown/text
     */
    static formatTemplate(template) {
        const parts = [];
        parts.push(`# Procedure Template for ${template.standardCode}${template.clauseRef ? ` Clause ${template.clauseRef}` : ''}\n`);
        parts.push(`*Generated from ${template.sections.length} approved examples*\n`);
        for (const section of template.sections) {
            parts.push(`## ${section.order}. ${section.name}${section.required ? ' (Required)' : ''}`);
            parts.push(section.placeholderText);
            parts.push('');
        }
        if (template.commonPhrases.length > 0) {
            parts.push('### Common Phrases to Consider:');
            for (const phrase of template.commonPhrases.slice(0, 5)) {
                parts.push(`- ${phrase}`);
            }
            parts.push('');
        }
        parts.push(`*Estimated length: ${template.estimatedLength} words*`);
        return parts.join('\n');
    }
}
//# sourceMappingURL=VeraTemplateGenerator.js.map