"""
VERA Deep Expertise Expansion - Enhanced Knowledge Extraction
Extracts knowledge across complete quality management ecosystem (14 major categories)
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
import logging
import sys

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# COMPLETE DOMAIN KEYWORDS - All 14 Categories
DOMAIN_KEYWORDS = {
    # PART 1: QUALITY METHODOLOGIES
    'six_sigma': [
        'dmaic', 'dmadv', 'six sigma', 'cpk', 'ppk', 'process capability', 'statistical process control',
        'spc', 'control chart', 'sigma level', 'defects per million', 'dpm', 'black belt', 'green belt',
        'master black belt', 'define measure analyze improve control', 'gage r&r', 'msa',
        'measurement system analysis', 'design of experiments', 'doe', 'factorial design',
        'response surface', 'taguchi', 'hypothesis testing', 'regression analysis', 'anova',
        'process improvement', 'variation reduction', 'statistical analysis', 'capability study'
    ],
    'lean': [
        'lean', '5s', 'six s', 'kaizen', 'value stream mapping', 'vsm', 'waste elimination',
        'muda', 'mura', 'muri', 'just in time', 'jit', 'kanban', 'pull system', 'continuous flow',
        'takt time', 'one piece flow', 'poka-yoke', 'mistake-proofing', 'oee', 'overall equipment effectiveness',
        'lead time', 'throughput', 'cycle time', 'work in progress', 'wip', 'inventory turns',
        'smed', 'quick changeover', 'gemba', 'gemba walk', 'seiri', 'seiton', 'seiso', 'seiketsu', 'shitsuke'
    ],
    'rca': [
        'root cause', '5-why', 'five why', 'fishbone', 'ishikawa', 'fault tree', 'cause and effect',
        'why why analysis', 'root cause analysis', 'rca', 'contributing factor', 'underlying cause',
        'systemic cause', 'pareto', 'pareto analysis', '80/20', 'fmea', 'failure mode', 'fmeca',
        'criticality', 'fault tree analysis', 'fta', 'and gate', 'or gate', 'cut set'
    ],
    '8d': [
        '8d', '8 disciplines', 'eight disciplines', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8',
        'team formation', 'problem description', 'interim containment', 'permanent fix', 'verification',
        'prevention', 'closure', '8d report', 'team assembly', '5w2h', 'what when where who how many'
    ],
    'capa': [
        'corrective action', 'preventive action', 'capa', 'effectiveness verification', 'nonconformance',
        'nc', 'corrective and preventive action', 'action plan', 'implementation verification',
        'recurrence prevention', 'closure verification', 'nonconformity', 'nonconformity management'
    ],
    
    # PART 2: QUALITY STANDARDS
    'iso_standards': [
        'iso 9001', 'iso 13485', 'iso 14001', 'iso 45001', 'iso 50001', 'iso 19011', 'iso 9000',
        'iso 26262', 'iso/iec 62304', 'iso/iec 90003', 'iso standard', 'requirement', 'clause',
        'standard', 'compliance', 'conformity', 'risk-based thinking', 'process approach',
        'customer focus', 'leadership', 'engagement', 'improvement', 'evidence-based decision'
    ],
    'aerospace': [
        'as9100', 'as9110', 'as9120', 'faa part 21', 'faa part 145', 'faa part 23', 'faa part 25',
        'faa part 33', 'faa part 135', 'easa', 'casa', 'uk caa', 'type certificate', 'design approval',
        'production approval', 'doa', 'poa', 'airworthiness', 'airworthiness directive', 'ad',
        'service bulletin', 'configuration management', 'change control', 'counterfeit parts',
        'fod', 'foreign object debris', 'traceability', 'ndt', 'nondestructive testing'
    ],
    'automotive': [
        'iatf 16949', 'apqp', 'advanced product quality planning', 'ppap', 'production part approval',
        'fmea', 'design fmea', 'process fmea', 'dfmea', 'pfmea', 'control plan', 'layered process audit',
        'lpa', 'customer-specific requirement', 'csr', 'supplier quality', 'supplier audit',
        'supplier evaluation', 'supplier assessment', 'supplier performance'
    ],
    'medical_device': [
        'fda 21 cfr part 11', 'fda qsr', 'quality system regulation', 'medical device',
        'design controls', 'risk management', 'iso 14971', 'mdr', 'medical device reporting',
        'post-market surveillance', 'adverse event', '510k', 'pma', 'premarket approval',
        'class i', 'class ii', 'class iii', 'form 483', 'warning letter', 'fda inspection',
        'clinical validation', 'design input', 'design output', 'design review', 'design verification',
        'design validation', 'design transfer'
    ],
    'pharmaceutical': [
        'cgmp', 'current good manufacturing practice', 'fda 21 cfr part 210', 'fda 21 cfr part 211',
        'validation', 'iq', 'oq', 'pq', 'installation qualification', 'operational qualification',
        'performance qualification', 'batch record', 'deviation', 'change control', 'investigation'
    ],
    
    # PART 3: REGULATORY
    'regulatory_fda': [
        'fda', 'food and drug administration', 'device classification', '510k', 'substantial equivalence',
        'pma', 'premarket approval', 'form 483', 'warning letter', 'untitled letter', 'fda inspection',
        'inspection type', 'routine inspection', 'directed inspection', 'surveillance inspection',
        'compliance inspection', 'adverse event', 'mdr', 'medical device reporting', 'recall',
        'class i recall', 'class ii recall', 'class iii recall', 'correction', 'withdrawal',
        'inspection readiness', 'inspection preparation', 'finding response'
    ],
    'regulatory_faa': [
        'faa', 'federal aviation administration', 'part 21', 'part 23', 'part 25', 'part 33',
        'part 145', 'part 135', 'design organization approval', 'production organization approval',
        'type certification', 'airworthiness approval', 'certification specification', 'special condition',
        'repair station', 'work authority', 'airworthiness directive', 'service bulletin',
        'continued airworthiness', 'maintenance program', 'continuing airworthiness'
    ],
    'regulatory_easa': [
        'easa', 'european union aviation safety agency', 'certification specification', 'cs-23', 'cs-25',
        'cs-e', 'cs-o', 'easy access rules', 'part-21', 'part-145', 'design approval', 'type certificate',
        'restricted type certificate', 'production organization approval', 'poa', 'maintenance planning document',
        'mpd', 'maintenance procedure', 'continuing airworthiness', 'airworthiness directive'
    ],
    
    # PART 4: QUALITY TOOLS
    'quality_tools': [
        'pareto', 'pareto chart', 'pareto principle', '80/20', 'fishbone diagram', 'ishikawa',
        'control chart', 'x-bar chart', 'r chart', 'p chart', 'c chart', 'u chart', 'imr chart',
        'ewma', 'cusum', 'histogram', 'scatter plot', 'run chart', 'check sheet', 'flowchart',
        'brainstorming', 'affinity diagram', 'priority matrix', 'tree diagram', 'process flow',
        'value stream map', 'kaizen event', 'poka-yoke', 'standard work', 'western electric rules',
        'nelson rules', 'out of control', 'special cause', 'common cause', 'rational subgroup'
    ],
    'statistical_tools': [
        'descriptive statistics', 'inferential statistics', 'mean', 'median', 'mode', 'standard deviation',
        'variance', 'hypothesis testing', 't-test', 'anova', 'chi-square', 'regression', 'linear regression',
        'multiple regression', 'logistic regression', 'correlation', 'covariance', 'confidence interval',
        'p-value', 'significance', 'power analysis', 'sample size', 'factorial design', 'fractional factorial',
        'response surface', 'rsm', 'central composite', 'plackett-burman', 'taguchi', 'main effect',
        'interaction', 'blocking', 'randomization', 'doe', 'design of experiments'
    ],
    
    # PART 5-14: Additional Domains
    'supplier_quality': [
        'supplier audit', 'supplier evaluation', 'supplier assessment', 'supplier performance',
        'approved supplier list', 'asl', 'supplier rating', 'supplier scorecard', 'supplier development',
        'quality agreement', 'supplier traceability', 'counterfeit prevention', 'supplier capability',
        'supplier financial', 'supplier technical', 'supplier delivery', 'supplier cost'
    ],
    'auditing': [
        'internal audit', 'external audit', 'audit finding', 'audit observation', 'audit checklist',
        'audit plan', 'audit scope', 'audit evidence', 'audit trail', 'audit report', 'audit follow-up',
        'surveillance audit', 'risk-based audit', 'audit sampling', 'statistical sampling',
        'judgment sampling', 'stratified sampling', 'audit technique', 'interviewing', 'document review',
        'observation', 'testing', 'tracing', 'verification', 'auditor competency', 'audit program'
    ],
    'continuous_improvement': [
        'pdca', 'plan do check act', 'deming cycle', 'continuous improvement', 'kaizen', 'kaizen event',
        'rapid improvement', 'suggestion system', 'cross-functional team', 'improvement project',
        'kpi', 'key performance indicator', 'metrics', 'performance management', 'target setting',
        'quality objectives', 'strategic planning', 'improvement roadmap'
    ],
    'leadership': [
        'quality leadership', 'quality vision', 'quality policy', 'management review', 'management commitment',
        'resource allocation', 'risk-based thinking', 'opportunity', 'risk identification', 'risk assessment',
        'risk mitigation', 'residual risk', 'customer focus', 'voice of customer', 'customer satisfaction',
        'customer complaint', 'employee engagement', 'competency', 'empowerment', 'recognition'
    ],
    'training': [
        'training', 'competence', 'competency', 'effectiveness verification', 'training record',
        'training needs', 'training plan', 'competence assessment', 'qualification', 'certification',
        'refresher training', 'on-the-job training', 'ojt', 'knowledge testing', 'skills demonstration',
        'performance verification', 'competency confirmation', 'training history', 'training documentation'
    ],
    'regulatory_compliance': [
        'regulatory framework', 'authority hierarchy', 'applicable regulation', 'compliance requirement',
        'inspection procedure', 'enforcement', 'mock audit', 'inspection preparation', 'readiness verification',
        'inspector interaction', 'observation response', 'document production', 'finding response',
        'corrective action plan', 'regulatory change', 'change monitoring', 'impact assessment',
        'implementation planning', 'compliance tracking'
    ],
    'industry_specific': [
        'aerospace quality', 'automotive quality', 'medical device quality', 'pharmaceutical quality',
        'food quality', 'beverage quality', 'fssc 22000', 'haccp', 'allergen management', 'recall procedure',
        'software quality', 'software lifecycle', 'development lifecycle', 'testing', 'configuration management',
        'version control', 'software validation'
    ],
    'advanced_quality': [
        'design for quality', 'design for manufacturability', 'dfm', 'design for assembly', 'dfa',
        'design for testability', 'dft', 'design for reliability', 'design for maintainability',
        'design for environment', 'design for cost', 'cost of quality', 'coq', 'prevention cost',
        'appraisal cost', 'internal failure cost', 'external failure cost', 'roi', 'reliability engineering',
        'failure rate', 'mtbf', 'mttf', 'mttr', 'reliability testing', 'accelerated life testing',
        'quality function deployment', 'qfd', 'house of quality', 'customer requirement', 'technical requirement',
        'competitive analysis', 'target setting', 'quality metrics', 'data collection', 'trending', 'reporting'
    ],
    'soft_skills': [
        'team leadership', 'team formation', 'role clarification', 'communication', 'conflict resolution',
        'performance management', 'motivation', 'effective listening', 'clear messaging', 'documentation',
        'presentation skills', 'report writing', 'change management', 'change planning', 'stakeholder management',
        'resistance management', 'sustainability', 'decision-making', 'problem definition', 'alternative generation',
        'evaluation criteria', 'selection', 'implementation', 'project management', 'planning', 'scheduling',
        'resource allocation', 'risk management', 'budget control'
    ],
    'emerging_trends': [
        'industry 4.0', 'smart manufacturing', 'iot', 'internet of things', 'data analytics', 'predictive maintenance',
        'real-time quality', 'automated testing', 'big data quality', 'artificial intelligence', 'machine learning',
        'defect detection', 'predictive analytics', 'automated inspection', 'pattern recognition', 'optimization',
        'blockchain', 'supply chain traceability', 'immutable record', 'counterfeit prevention', 'digital twin',
        'sustainability', 'environmental compliance', 'circular economy', 'waste reduction', 'green manufacturing',
        'lifecycle assessment', 'digital transformation', 'paperless quality', 'cloud-based qms', 'mobile inspection',
        'real-time dashboard', 'erp integration', 'mes integration'
    ]
}

# ENHANCED EXTRACTION PATTERNS - All Domains
EXTRACTION_PATTERNS = {
    'six_sigma': {
        'dmaic_phases': [
            r'(?i)(define|d)\s+phase[:\s]+([^\.]+)',
            r'(?i)(measure|m)\s+phase[:\s]+([^\.]+)',
            r'(?i)(analyze|a)\s+phase[:\s]+([^\.]+)',
            r'(?i)(improve|i)\s+phase[:\s]+([^\.]+)',
            r'(?i)(control|c)\s+phase[:\s]+([^\.]+)'
        ],
        'statistical_concepts': [
            r'(?i)cpk\s*[=:]?\s*([0-9.]+)',
            r'(?i)process capability[:\s]+([^\.]+)',
            r'(?i)sigma level[:\s]+([^\.]+)',
            r'(?i)control limits[:\s]+([^\.]+)',
            r'(?i)gage r&r[:\s]+([^\.]+)',
            r'(?i)measurement system[:\s]+([^\.]+)'
        ]
    },
    'rca': {
        'why_levels': [
            r'(?i)why\s+1[:\s]+([^\.]+)',
            r'(?i)why\s+2[:\s]+([^\.]+)',
            r'(?i)why\s+3[:\s]+([^\.]+)',
            r'(?i)why\s+4[:\s]+([^\.]+)',
            r'(?i)why\s+5[:\s]+([^\.]+)'
        ],
        'fishbone_categories': [
            r'(?i)(man|people|personnel)[:\s]+([^\.]+)',
            r'(?i)(machine|equipment)[:\s]+([^\.]+)',
            r'(?i)(material|raw material)[:\s]+([^\.]+)',
            r'(?i)(method|process)[:\s]+([^\.]+)',
            r'(?i)(measurement|measure)[:\s]+([^\.]+)',
            r'(?i)(environment|mother nature)[:\s]+([^\.]+)'
        ],
        'fmea_elements': [
            r'(?i)severity[:\s]+([^\.]+)',
            r'(?i)occurrence[:\s]+([^\.]+)',
            r'(?i)detection[:\s]+([^\.]+)',
            r'(?i)rpn[:\s]+([^\.]+)',
            r'(?i)risk priority number[:\s]+([^\.]+)'
        ]
    },
    '8d': {
        'disciplines': [
            r'(?i)d1[:\s]+([^\.]+)',
            r'(?i)d2[:\s]+([^\.]+)',
            r'(?i)d3[:\s]+([^\.]+)',
            r'(?i)d4[:\s]+([^\.]+)',
            r'(?i)d5[:\s]+([^\.]+)',
            r'(?i)d6[:\s]+([^\.]+)',
            r'(?i)d7[:\s]+([^\.]+)',
            r'(?i)d8[:\s]+([^\.]+)'
        ]
    },
    'lean': {
        '5s_steps': [
            r'(?i)(sort|seiri)[:\s]+([^\.]+)',
            r'(?i)(straighten|set|seiton)[:\s]+([^\.]+)',
            r'(?i)(shine|sweep|seiso)[:\s]+([^\.]+)',
            r'(?i)(standardize|seiketsu)[:\s]+([^\.]+)',
            r'(?i)(sustain|shitsuke)[:\s]+([^\.]+)'
        ],
        'waste_types': [
            r'(?i)overproduction[:\s]+([^\.]+)',
            r'(?i)waiting[:\s]+([^\.]+)',
            r'(?i)transportation[:\s]+([^\.]+)',
            r'(?i)over-processing[:\s]+([^\.]+)',
            r'(?i)inventory[:\s]+([^\.]+)',
            r'(?i)motion[:\s]+([^\.]+)',
            r'(?i)defects[:\s]+([^\.]+)',
            r'(?i)underutilized talent[:\s]+([^\.]+)'
        ]
    },
    'iso_standards': {
        'clauses': [
            r'(?i)clause\s+(\d+)[:\s]+([^\.]+)',
            r'(?i)requirement\s+(\d+)[:\s]+([^\.]+)',
            r'(?i)iso\s+9001[:\s]+([^\.]+)',
            r'(?i)iso\s+13485[:\s]+([^\.]+)'
        ]
    },
    'regulatory_fda': {
        'requirements': [
            r'(?i)fda\s+requirement[:\s]+([^\.]+)',
            r'(?i)21\s+cfr\s+part\s+(\d+)[:\s]+([^\.]+)',
            r'(?i)form\s+483[:\s]+([^\.]+)',
            r'(?i)warning letter[:\s]+([^\.]+)'
        ]
    },
    'regulatory_faa': {
        'parts': [
            r'(?i)part\s+21[:\s]+([^\.]+)',
            r'(?i)part\s+145[:\s]+([^\.]+)',
            r'(?i)type certificate[:\s]+([^\.]+)',
            r'(?i)airworthiness[:\s]+([^\.]+)'
        ]
    }
}

# Q&A Generation Templates by Domain
QA_TEMPLATES = {
    'six_sigma': [
        ('Explain the DMAIC process', 'dmaic'),
        ('What are the 5 phases of DMAIC?', 'dmaic'),
        ('How do you calculate Cpk?', 'cpk'),
        ('What is process capability?', 'capability'),
        ('How to perform Gage R&R?', 'gage'),
        ('What is Design of Experiments?', 'doe'),
        ('When to use control charts?', 'control chart'),
        ('What are the Six Sigma belt levels?', 'belt')
    ],
    'rca': [
        ('What is the 5-Why method?', 'why'),
        ('How to use a fishbone diagram?', 'fishbone'),
        ('What are FMEA severity levels?', 'fmea'),
        ('How to calculate RPN?', 'rpn'),
        ('What is Fault Tree Analysis?', 'fault tree')
    ],
    '8d': [
        ('What is the 8D problem solving process?', '8d'),
        ('What is D1 in 8D?', 'd1'),
        ('What is D4 in 8D?', 'd4'),
        ('How to verify corrective action in 8D?', 'd6')
    ],
    'lean': [
        ('What are the 5S?', '5s'),
        ('What is Kaizen?', 'kaizen'),
        ('How to create a value stream map?', 'vsm'),
        ('What are the 8 types of waste?', 'waste'),
        ('How to calculate OEE?', 'oee')
    ],
    'capa': [
        ('What is the CAPA workflow?', 'capa'),
        ('How to verify corrective action effectiveness?', 'effectiveness'),
        ('What is prevention of recurrence?', 'prevention')
    ],
    'iso_standards': [
        ('What is ISO 9001:2015?', 'iso 9001'),
        ('What is risk-based thinking?', 'risk'),
        ('What are ISO 9001 requirements?', 'requirement')
    ],
    'regulatory_fda': [
        ('What is FDA 510k?', '510k'),
        ('What is Form 483?', 'form 483'),
        ('What are FDA inspection types?', 'inspection')
    ],
    'regulatory_faa': [
        ('What is FAA Part 21?', 'part 21'),
        ('What is Type Certification?', 'type certificate'),
        ('What is Part 145?', 'part 145')
    ]
}

class EnhancedKnowledgeExtractor:
    def __init__(self, input_file: str, output_file: str):
        self.input_file = Path(input_file)
        self.output_file = Path(output_file)
        self.documents = []
        self.training_pairs = []
        self.statistics = defaultdict(lambda: {'documents': 0, 'pairs': 0})
        
    def load_documents(self):
        """Load parsed documents"""
        logger.info(f"Loading documents from {self.input_file}")
        if not self.input_file.exists():
            raise FileNotFoundError(f"Input file not found: {self.input_file}")
        
        with open(self.input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if isinstance(data, list):
            self.documents = data
        elif isinstance(data, dict) and 'documents' in data:
            self.documents = data['documents']
        else:
            self.documents = [data]
        
        logger.info(f"Loaded {len(self.documents)} documents")
    
    def categorize_document(self, doc: Dict) -> List[str]:
        """Categorize document by all domains"""
        text = self._get_document_text(doc).lower()
        categories = []
        
        for domain, keywords in DOMAIN_KEYWORDS.items():
            score = sum(1 for keyword in keywords if keyword in text)
            if score >= 2:
                categories.append(domain)
        
        return categories if categories else ['generic']
    
    def _get_document_text(self, doc: Dict) -> str:
        """Extract text content"""
        if isinstance(doc, str):
            return doc
        elif isinstance(doc, dict):
            for field in ['text', 'content', 'body', 'description', 'summary']:
                if field in doc:
                    return str(doc[field])
            return ' '.join(str(v) for v in doc.values() if isinstance(v, str))
        return str(doc)
    
    def extract_domain_knowledge(self, doc: Dict, domain: str) -> List[Dict]:
        """Extract structured knowledge"""
        text = self._get_document_text(doc)
        knowledge = []
        
        if domain in EXTRACTION_PATTERNS:
            patterns = EXTRACTION_PATTERNS[domain]
            for pattern_type, patterns_list in patterns.items():
                for pattern in patterns_list:
                    matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
                    for match in matches:
                        knowledge.append({
                            'type': pattern_type,
                            'content': match.group(0),
                            'domain': domain
                        })
        
        return knowledge
    
    def generate_qa_pairs(self, doc: Dict, domain: str, knowledge: List[Dict]) -> List[Dict]:
        """Generate comprehensive Q&A pairs"""
        pairs = []
        text = self._get_document_text(doc)
        
        # Use domain-specific templates
        if domain in QA_TEMPLATES:
            for question_template, keyword in QA_TEMPLATES[domain]:
                section = self._extract_section(text, keyword, 500)
                if section:
                    pairs.append({
                        'prompt': question_template,
                        'completion': f'{section[:400]}...',
                        'domain': domain
                    })
        
        # Generate additional contextual Q&A
        pairs.extend(self._generate_contextual_qa(text, domain, knowledge))
        
        return pairs
    
    def _generate_contextual_qa(self, text: str, domain: str, knowledge: List[Dict]) -> List[Dict]:
        """Generate contextual Q&A from extracted knowledge"""
        pairs = []
        
        # Extract key sentences
        sentences = re.split(r'[.!?]+', text)
        key_sentences = [s.strip() for s in sentences if 50 < len(s.strip()) < 300]
        
        # Generate Q&A from key sentences (limit per document)
        for sentence in key_sentences[:10]:
            question = self._sentence_to_question(sentence, domain)
            if question:
                pairs.append({
                    'prompt': question,
                    'completion': sentence[:500],
                    'domain': domain
                })
        
        return pairs
    
    def _sentence_to_question(self, sentence: str, domain: str) -> Optional[str]:
        """Convert statement to domain-specific question"""
        sentence_lower = sentence.lower()
        
        # Domain-specific question generation
        if domain == 'six_sigma':
            if 'dmaic' in sentence_lower:
                return 'Explain the DMAIC process'
            if 'cpk' in sentence_lower or 'capability' in sentence_lower:
                return 'What is process capability?'
        
        elif domain == 'rca':
            if 'why' in sentence_lower:
                return 'What is the 5-Why method?'
            if 'fishbone' in sentence_lower:
                return 'How to use a fishbone diagram?'
        
        elif domain == 'lean':
            if '5s' in sentence_lower:
                return 'What are the 5S?'
            if 'kaizen' in sentence_lower:
                return 'What is Kaizen?'
        
        # Generic question generation
        if 'is' in sentence_lower[:20]:
            parts = sentence.split('is')
            if len(parts) > 1:
                return f"What is {parts[1].split('.')[0].strip()}?"
        elif 'are' in sentence_lower[:20]:
            parts = sentence.split('are')
            if len(parts) > 1:
                return f"What are {parts[1].split('.')[0].strip()}?"
        elif 'should' in sentence_lower[:30]:
            parts = sentence.split('should')
            if len(parts) > 1:
                return f"How {parts[1].split('.')[0].strip()}?"
        
        return None
    
    def _extract_section(self, text: str, keyword: str, context_length: int = 500) -> Optional[str]:
        """Extract section around keyword"""
        pattern = re.compile(rf'.{{0,{context_length//2}}}{re.escape(keyword)}.{{0,{context_length//2}}}', 
                           re.IGNORECASE)
        match = pattern.search(text)
        return match.group(0) if match else None
    
    def process_documents(self):
        """Process all documents"""
        logger.info("Starting enhanced knowledge extraction...")
        
        for idx, doc in enumerate(self.documents):
            if (idx + 1) % 1000 == 0:
                logger.info(f"Processed {idx + 1}/{len(self.documents)} documents")
            
            categories = self.categorize_document(doc)
            
            for domain in categories:
                self.statistics[domain]['documents'] += 1
                knowledge = self.extract_domain_knowledge(doc, domain)
                qa_pairs = self.generate_qa_pairs(doc, domain, knowledge)
                
                for pair in qa_pairs:
                    pair['source'] = doc.get('id', doc.get('title', f'doc_{idx}'))
                    self.training_pairs.append(pair)
                    self.statistics[domain]['pairs'] += 1
    
    def save_output(self):
        """Save to JSONL"""
        logger.info(f"Saving {len(self.training_pairs)} training pairs")
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.output_file, 'w', encoding='utf-8') as f:
            for pair in self.training_pairs:
                output = {
                    'prompt': pair['prompt'],
                    'completion': pair['completion']
                }
                f.write(json.dumps(output, ensure_ascii=False) + '\n')
        
        logger.info(f"Saved {len(self.training_pairs)} training pairs")
    
    def print_statistics(self):
        """Print comprehensive statistics"""
        print("\n" + "="*80)
        print("VERA DEEP EXPERTISE EXPANSION - EXTRACTION STATISTICS")
        print("="*80)
        print(f"\nTotal Documents Analyzed: {len(self.documents):,}")
        print(f"Total Training Pairs Generated: {len(self.training_pairs):,}")
        print("\nBreakdown by Domain:")
        print("-"*80)
        print(f"{'DOMAIN':<30s} | {'DOCUMENTS':>12s} | {'PAIRS':>12s}")
        print("-"*80)
        
        for domain, stats in sorted(self.statistics.items(), key=lambda x: x[1]['pairs'], reverse=True):
            print(f"{domain.upper():<30s} | {stats['documents']:>12,} | {stats['pairs']:>12,}")
        
        print("="*80)
        print(f"\nTarget: 500,000+ training pairs")
        print(f"Current: {len(self.training_pairs):,} training pairs")
        print(f"Progress: {(len(self.training_pairs)/500000)*100:.1f}%")
        print("="*80)


def main():
    input_file = r"D:\quality-llm\data\parsed_all_comprehensive.json"
    output_file = r"D:\quality-llm\data\training_data_deep_enriched.jsonl"
    
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    extractor = EnhancedKnowledgeExtractor(input_file, output_file)
    
    try:
        extractor.load_documents()
        extractor.process_documents()
        extractor.save_output()
        extractor.print_statistics()
        logger.info("Enhanced knowledge extraction completed!")
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        raise


if __name__ == '__main__':
    main()

