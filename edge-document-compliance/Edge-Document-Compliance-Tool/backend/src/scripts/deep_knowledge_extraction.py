"""
Deep Knowledge Extraction from Quality Documents
Intelligently categorizes and extracts knowledge by domain type

USAGE:
    This script should be run from D:\quality-llm\ directory:
    
    python scripts/deep_knowledge_extraction.py
    
    Or copy this file to D:\quality-llm\scripts\ and run from there.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
import logging
import sys

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Domain keywords for categorization
DOMAIN_KEYWORDS = {
    'six_sigma': [
        'dmaic', 'six sigma', 'cpk', 'ppk', 'process capability', 'statistical process control',
        'spc', 'control chart', 'sigma level', 'defects per million', 'dpm', 'black belt',
        'green belt', 'master black belt', 'define measure analyze improve control',
        'process improvement', 'variation reduction', 'statistical analysis'
    ],
    'rca': [
        'root cause', '5-why', 'five why', 'fishbone', 'ishikawa', 'fault tree',
        'cause and effect', 'why why analysis', 'root cause analysis', 'rca',
        'contributing factor', 'underlying cause', 'systemic cause'
    ],
    'capa': [
        'corrective action', 'preventive action', 'capa', 'effectiveness verification',
        'nonconformance', 'nc', 'corrective and preventive action', 'action plan',
        'implementation verification', 'recurrence prevention', 'closure verification'
    ],
    'audit': [
        'audit', 'internal audit', 'external audit', 'audit finding', 'nonconformance',
        'observation', 'audit checklist', 'audit plan', 'audit scope', 'audit evidence',
        'audit trail', 'audit report', 'audit follow-up', 'surveillance audit'
    ],
    'lean': [
        'lean', '5s', 'five s', 'kaizen', 'value stream mapping', 'vsm', 'waste elimination',
        'muda', 'mura', 'muri', 'just in time', 'jit', 'kanban', 'pull system',
        'continuous flow', 'takt time', 'one piece flow'
    ],
    '8d': [
        '8d', '8 disciplines', 'eight disciplines', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8',
        'team formation', 'problem description', 'interim containment', 'root cause',
        'permanent fix', 'verification', 'prevention', 'closure', '8d report'
    ],
    'regulatory': [
        'fda', 'faa', 'easa', 'casa', 'regulatory', 'compliance', 'approval', 'certification',
        'type certificate', 'design approval', 'part 21', 'part 145', 'part 11', 'cfr',
        'warning letter', '483', 'inspection', 'regulatory requirement', 'authority'
    ],
    'quality_tools': [
        'pareto', 'pareto chart', 'pareto principle', '80/20', 'fishbone diagram',
        'control chart', 'spc', 'fmea', 'failure mode', 'doe', 'design of experiments',
        'histogram', 'scatter plot', 'run chart', 'check sheet', 'flowchart', 'pdca',
        'plan do check act', 'quality tools', 'seven tools'
    ],
    'supplier_quality': [
        'supplier audit', 'supplier evaluation', 'supplier assessment', 'apqp', 'ppap',
        'advanced product quality planning', 'production part approval', 'supplier quality',
        'supplier performance', 'approved supplier list', 'asl', 'supplier rating'
    ],
    'training': [
        'training', 'competence', 'competency', 'effectiveness verification', 'training record',
        'training needs', 'training plan', 'competence assessment', 'qualification',
        'certification', 'refresher training', 'on-the-job training', 'ojt'
    ],
    'standards': [
        'iso 9001', 'iso 13485', 'iso 14001', 'iso 45001', 'as9100', 'iatf 16949',
        'iso standard', 'requirement', 'clause', 'standard', 'compliance', 'conformity'
    ]
}

# Domain-specific extraction patterns
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
            r'(?i)control limits[:\s]+([^\.]+)'
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
            r'(?i)(environment)[:\s]+([^\.]+)'
        ]
    },
    'capa': {
        'workflow_steps': [
            r'(?i)step\s+\d+[:\s]+([^\.]+)',
            r'(?i)(identify|identification)[:\s]+([^\.]+)',
            r'(?i)(investigate|investigation)[:\s]+([^\.]+)',
            r'(?i)(implement|implementation)[:\s]+([^\.]+)',
            r'(?i)(verify|verification)[:\s]+([^\.]+)',
            r'(?i)(effectiveness)[:\s]+([^\.]+)'
        ]
    },
    'audit': {
        'audit_steps': [
            r'(?i)audit\s+plan[:\s]+([^\.]+)',
            r'(?i)audit\s+scope[:\s]+([^\.]+)',
            r'(?i)audit\s+checklist[:\s]+([^\.]+)',
            r'(?i)audit\s+finding[:\s]+([^\.]+)',
            r'(?i)nonconformance[:\s]+([^\.]+)'
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
        'kaizen': [
            r'(?i)kaizen[:\s]+([^\.]+)',
            r'(?i)continuous improvement[:\s]+([^\.]+)'
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
    }
}


class DeepKnowledgeExtractor:
    def __init__(self, input_file: str, output_file: str):
        self.input_file = Path(input_file)
        self.output_file = Path(output_file)
        self.documents = []
        self.training_pairs = []
        self.statistics = defaultdict(lambda: {'documents': 0, 'pairs': 0})
        
    def load_documents(self):
        """Load parsed documents from JSON file"""
        logger.info(f"Loading documents from {self.input_file}")
        
        if not self.input_file.exists():
            raise FileNotFoundError(f"Input file not found: {self.input_file}")
        
        with open(self.input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Handle different JSON structures
        if isinstance(data, list):
            self.documents = data
        elif isinstance(data, dict) and 'documents' in data:
            self.documents = data['documents']
        else:
            self.documents = [data]
        
        logger.info(f"Loaded {len(self.documents)} documents")
    
    def categorize_document(self, doc: Dict) -> List[str]:
        """Categorize document by domain based on keywords"""
        text = self._get_document_text(doc).lower()
        categories = []
        
        for domain, keywords in DOMAIN_KEYWORDS.items():
            score = sum(1 for keyword in keywords if keyword in text)
            if score >= 2:  # At least 2 keyword matches
                categories.append(domain)
        
        return categories
    
    def _get_document_text(self, doc: Dict) -> str:
        """Extract text content from document"""
        if isinstance(doc, str):
            return doc
        elif isinstance(doc, dict):
            # Try common text fields
            for field in ['text', 'content', 'body', 'description', 'summary']:
                if field in doc:
                    return str(doc[field])
            # Concatenate all string values
            return ' '.join(str(v) for v in doc.values() if isinstance(v, str))
        return str(doc)
    
    def extract_domain_knowledge(self, doc: Dict, domain: str) -> List[Dict]:
        """Extract structured knowledge for a specific domain"""
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
        """Generate Q&A training pairs from extracted knowledge"""
        pairs = []
        text = self._get_document_text(doc)
        
        # Domain-specific Q&A generation
        if domain == 'six_sigma':
            pairs.extend(self._generate_six_sigma_qa(text, knowledge))
        elif domain == 'rca':
            pairs.extend(self._generate_rca_qa(text, knowledge))
        elif domain == 'capa':
            pairs.extend(self._generate_capa_qa(text, knowledge))
        elif domain == 'audit':
            pairs.extend(self._generate_audit_qa(text, knowledge))
        elif domain == 'lean':
            pairs.extend(self._generate_lean_qa(text, knowledge))
        elif domain == '8d':
            pairs.extend(self._generate_8d_qa(text, knowledge))
        elif domain == 'regulatory':
            pairs.extend(self._generate_regulatory_qa(text, knowledge))
        elif domain == 'quality_tools':
            pairs.extend(self._generate_quality_tools_qa(text, knowledge))
        else:
            # Generic Q&A generation
            pairs.extend(self._generate_generic_qa(text, domain))
        
        return pairs
    
    def _generate_six_sigma_qa(self, text: str, knowledge: List[Dict]) -> List[Dict]:
        """Generate Six Sigma Q&A pairs"""
        pairs = []
        
        # DMAIC questions
        if 'dmaic' in text.lower():
            dmaic_section = self._extract_section(text, 'dmaic', 500)
            if dmaic_section:
                pairs.append({
                    'prompt': 'Explain the DMAIC process',
                    'completion': f'DMAIC is a structured problem-solving methodology with 5 phases: {dmaic_section[:300]}...'
                })
                pairs.append({
                    'prompt': 'What are the 5 phases of DMAIC?',
                    'completion': f'The 5 phases of DMAIC are: {dmaic_section[:300]}...'
                })
        
        # Process capability questions
        if 'cpk' in text.lower() or 'process capability' in text.lower():
            capability_section = self._extract_section(text, 'capability', 400)
            if capability_section:
                pairs.append({
                    'prompt': 'How do you calculate Cpk?',
                    'completion': f'Cpk calculation: {capability_section[:300]}...'
                })
                pairs.append({
                    'prompt': 'What is process capability?',
                    'completion': f'Process capability refers to: {capability_section[:300]}...'
                })
        
        return pairs
    
    def _generate_rca_qa(self, text: str, knowledge: List[Dict]) -> List[Dict]:
        """Generate RCA Q&A pairs"""
        pairs = []
        
        if '5-why' in text.lower() or 'five why' in text.lower():
            why_section = self._extract_section(text, 'why', 400)
            if why_section:
                pairs.append({
                    'prompt': 'What is the 5-Why method?',
                    'completion': f'The 5-Why method is: {why_section[:300]}...'
                })
                pairs.append({
                    'prompt': 'How to perform 5-Why analysis?',
                    'completion': f'To perform 5-Why analysis: {why_section[:300]}...'
                })
        
        if 'fishbone' in text.lower() or 'ishikawa' in text.lower():
            fishbone_section = self._extract_section(text, 'fishbone', 400)
            if fishbone_section:
                pairs.append({
                    'prompt': 'How to use a fishbone diagram?',
                    'completion': f'Fishbone diagram usage: {fishbone_section[:300]}...'
                })
                pairs.append({
                    'prompt': 'What are fishbone diagram categories?',
                    'completion': f'Fishbone categories include: {fishbone_section[:300]}...'
                })
        
        return pairs
    
    def _generate_capa_qa(self, text: str, knowledge: List[Dict]) -> List[Dict]:
        """Generate CAPA Q&A pairs"""
        pairs = []
        
        if 'corrective action' in text.lower():
            capa_section = self._extract_section(text, 'corrective', 500)
            if capa_section:
                pairs.append({
                    'prompt': 'What is the CAPA workflow?',
                    'completion': f'CAPA workflow steps: {capa_section[:300]}...'
                })
                pairs.append({
                    'prompt': 'How to verify corrective action effectiveness?',
                    'completion': f'Effectiveness verification: {capa_section[:300]}...'
                })
        
        return pairs
    
    def _generate_audit_qa(self, text: str, knowledge: List[Dict]) -> List[Dict]:
        """Generate Audit Q&A pairs"""
        pairs = []
        
        if 'audit' in text.lower():
            audit_section = self._extract_section(text, 'audit', 500)
            if audit_section:
                pairs.append({
                    'prompt': 'How to plan a risk-based audit?',
                    'completion': f'Risk-based audit planning: {audit_section[:300]}...'
                })
                pairs.append({
                    'prompt': 'What is the difference between nonconformance and observation?',
                    'completion': f'Nonconformance vs observation: {audit_section[:300]}...'
                })
        
        return pairs
    
    def _generate_lean_qa(self, text: str, knowledge: List[Dict]) -> List[Dict]:
        """Generate Lean Q&A pairs"""
        pairs = []
        
        if '5s' in text.lower() or 'five s' in text.lower():
            s5_section = self._extract_section(text, '5s', 400)
            if s5_section:
                pairs.append({
                    'prompt': 'What are the 5S?',
                    'completion': f'The 5S methodology: {s5_section[:300]}...'
                })
        
        if 'kaizen' in text.lower():
            kaizen_section = self._extract_section(text, 'kaizen', 400)
            if kaizen_section:
                pairs.append({
                    'prompt': 'What is Kaizen?',
                    'completion': f'Kaizen is: {kaizen_section[:300]}...'
                })
        
        return pairs
    
    def _generate_8d_qa(self, text: str, knowledge: List[Dict]) -> List[Dict]:
        """Generate 8D Q&A pairs"""
        pairs = []
        
        if '8d' in text.lower() or 'eight disciplines' in text.lower():
            d8_section = self._extract_section(text, '8d', 500)
            if d8_section:
                pairs.append({
                    'prompt': 'What is the 8D problem solving process?',
                    'completion': f'The 8D process: {d8_section[:300]}...'
                })
                pairs.append({
                    'prompt': 'What is D1 in 8D?',
                    'completion': f'D1 (Team Formation): {d8_section[:200]}...'
                })
        
        return pairs
    
    def _generate_regulatory_qa(self, text: str, knowledge: List[Dict]) -> List[Dict]:
        """Generate Regulatory Q&A pairs"""
        pairs = []
        
        if 'fda' in text.lower():
            fda_section = self._extract_section(text, 'fda', 400)
            if fda_section:
                pairs.append({
                    'prompt': 'What is the FDA 510k process?',
                    'completion': f'FDA 510k process: {fda_section[:300]}...'
                })
        
        if 'faa' in text.lower():
            faa_section = self._extract_section(text, 'faa', 400)
            if faa_section:
                pairs.append({
                    'prompt': 'What are FAA Type Certification steps?',
                    'completion': f'FAA Type Certification: {faa_section[:300]}...'
                })
        
        return pairs
    
    def _generate_quality_tools_qa(self, text: str, knowledge: List[Dict]) -> List[Dict]:
        """Generate Quality Tools Q&A pairs"""
        pairs = []
        
        if 'pareto' in text.lower():
            pareto_section = self._extract_section(text, 'pareto', 300)
            if pareto_section:
                pairs.append({
                    'prompt': 'When to use Pareto chart?',
                    'completion': f'Pareto chart usage: {pareto_section[:250]}...'
                })
        
        if 'fmea' in text.lower():
            fmea_section = self._extract_section(text, 'fmea', 400)
            if fmea_section:
                pairs.append({
                    'prompt': 'How to calculate FMEA risk priority number?',
                    'completion': f'FMEA RPN calculation: {fmea_section[:300]}...'
                })
        
        return pairs
    
    def _generate_generic_qa(self, text: str, domain: str) -> List[Dict]:
        """Generate generic Q&A pairs"""
        pairs = []
        
        # Extract key sentences
        sentences = re.split(r'[.!?]+', text)
        key_sentences = [s.strip() for s in sentences if len(s.strip()) > 50 and len(s.strip()) < 300]
        
        # Generate Q&A from key sentences
        for i, sentence in enumerate(key_sentences[:5]):  # Limit to 5 per document
            # Create question from sentence
            question = self._sentence_to_question(sentence)
            if question:
                pairs.append({
                    'prompt': question,
                    'completion': sentence[:500]
                })
        
        return pairs
    
    def _extract_section(self, text: str, keyword: str, context_length: int = 500) -> Optional[str]:
        """Extract section of text around keyword"""
        pattern = re.compile(rf'.{{0,{context_length//2}}}{re.escape(keyword)}.{{0,{context_length//2}}}', 
                           re.IGNORECASE)
        match = pattern.search(text)
        if match:
            return match.group(0)
        return None
    
    def _sentence_to_question(self, sentence: str) -> Optional[str]:
        """Convert a statement to a question"""
        # Simple heuristics to create questions
        if 'is' in sentence.lower()[:20]:
            return f"What is {sentence.split('is')[1].split('.')[0].strip()}?"
        elif 'are' in sentence.lower()[:20]:
            return f"What are {sentence.split('are')[1].split('.')[0].strip()}?"
        elif 'should' in sentence.lower()[:30]:
            return f"How {sentence.split('should')[1].split('.')[0].strip()}?"
        return None
    
    def process_documents(self):
        """Process all documents and extract knowledge"""
        logger.info("Starting deep knowledge extraction...")
        
        for idx, doc in enumerate(self.documents):
            if (idx + 1) % 1000 == 0:
                logger.info(f"Processed {idx + 1}/{len(self.documents)} documents")
            
            # Categorize document
            categories = self.categorize_document(doc)
            
            if not categories:
                # No specific category, use generic
                categories = ['generic']
            
            # Process each category
            for domain in categories:
                self.statistics[domain]['documents'] += 1
                
                # Extract knowledge
                knowledge = self.extract_domain_knowledge(doc, domain)
                
                # Generate Q&A pairs
                qa_pairs = self.generate_qa_pairs(doc, domain, knowledge)
                
                # Add to training pairs
                for pair in qa_pairs:
                    pair['domain'] = domain
                    pair['source'] = doc.get('id', doc.get('title', f'doc_{idx}'))
                    self.training_pairs.append(pair)
                    self.statistics[domain]['pairs'] += 1
    
    def save_output(self):
        """Save training pairs to JSONL file"""
        logger.info(f"Saving {len(self.training_pairs)} training pairs to {self.output_file}")
        
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.output_file, 'w', encoding='utf-8') as f:
            for pair in self.training_pairs:
                # Format for training (simplified)
                output = {
                    'prompt': pair['prompt'],
                    'completion': pair['completion']
                }
                f.write(json.dumps(output, ensure_ascii=False) + '\n')
        
        logger.info(f"Saved {len(self.training_pairs)} training pairs")
    
    def print_statistics(self):
        """Print extraction statistics"""
        print("\n" + "="*80)
        print("DEEP KNOWLEDGE EXTRACTION STATISTICS")
        print("="*80)
        print(f"\nTotal Documents Analyzed: {len(self.documents)}")
        print(f"Total Training Pairs Generated: {len(self.training_pairs)}")
        print("\nBreakdown by Domain:")
        print("-"*80)
        
        for domain, stats in sorted(self.statistics.items(), key=lambda x: x[1]['pairs'], reverse=True):
            print(f"{domain.upper():20s} | Documents: {stats['documents']:5d} | Pairs: {stats['pairs']:6d}")
        
        print("="*80)


def main():
    # File paths - adjust these to match your actual file locations
    input_file = r"D:\quality-llm\data\parsed_all_comprehensive.json"
    output_file = r"D:\quality-llm\data\training_data_deep_enriched.jsonl"
    
    # Allow command-line override
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    # Create extractor
    extractor = DeepKnowledgeExtractor(input_file, output_file)
    
    try:
        # Load documents
        extractor.load_documents()
        
        # Process documents
        extractor.process_documents()
        
        # Save output
        extractor.save_output()
        
        # Print statistics
        extractor.print_statistics()
        
        logger.info("Deep knowledge extraction completed successfully!")
        
    except Exception as e:
        logger.error(f"Error during extraction: {e}", exc_info=True)
        raise


if __name__ == '__main__':
    main()

