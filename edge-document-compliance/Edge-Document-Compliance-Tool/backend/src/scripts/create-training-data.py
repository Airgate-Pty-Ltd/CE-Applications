#!/usr/bin/env python3
"""
Training Data Generator for EDCAT Vera
Converts parsed documents into Q&A training pairs for LLM fine-tuning

Usage:
    python create-training-data.py --input parsed_documents.json --output training_data.jsonl

Requirements:
    pip install pandas
"""

import os
import sys
import json
import argparse
import re
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime


class TrainingDataGenerator:
    """Generate training data from parsed documents"""
    
    def __init__(self, parsed_docs_file: str, output_file: str):
        self.parsed_docs_file = Path(parsed_docs_file)
        self.output_file = Path(output_file)
        self.output_file.parent.mkdir(parents=True, exist_ok=True)
        
        self.training_pairs = []
        self.stats = {
            'clause_explanation': 0,
            'standard_reference': 0,
            'procedure': 0,
            'definition': 0,
            'quality_qa': 0,
            'total': 0
        }
    
    def generate_training_data(self) -> int:
        """Convert parsed documents into Q&A training pairs"""
        
        if not self.parsed_docs_file.exists():
            print(f"❌ Parsed documents file not found: {self.parsed_docs_file}")
            return 0
        
        print(f"📚 Loading parsed documents from: {self.parsed_docs_file}")
        
        with open(self.parsed_docs_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        documents = data.get('documents', [])
        metadata = data.get('metadata', {})
        
        print(f"📖 Found {len(documents)} documents\n")
        print(f"📊 Original stats: {metadata.get('stats', {})}\n")
        
        for idx, doc in enumerate(documents, 1):
            print(f"[{idx}/{len(documents)}] Processing: {doc['filename']}")
            
            text = doc.get('text', '')
            clauses = doc.get('clauses', [])
            standards = doc.get('standards', [])
            procedures = doc.get('procedures', [])
            definitions = doc.get('definitions', [])
            
            pairs_before = len(self.training_pairs)
            
            # TYPE 1: Clause explanations
            for clause in clauses[:3]:  # First 3 clauses per document
                if clause in text:
                    context = self.extract_clause_context(text, clause)
                    if context:
                        self.training_pairs.append({
                            'type': 'clause_explanation',
                            'prompt': f"Explain clause {clause}",
                            'completion': f"Clause {clause}: {context}",
                            'source': doc['filename'],
                            'metadata': {
                                'clause': clause,
                                'standard': self.find_standard_for_clause(text, clause)
                            }
                        })
                        self.stats['clause_explanation'] += 1
            
            # TYPE 2: Standard explanations
            for standard in standards[:2]:  # First 2 standards per document
                context = self.extract_standard_context(text, standard)
                if context:
                    self.training_pairs.append({
                        'type': 'standard_reference',
                        'prompt': f"What is {standard}?",
                        'completion': f"{standard} is referenced in {doc['filename']}. {context}",
                        'source': doc['filename'],
                        'metadata': {
                            'standard': standard
                        }
                    })
                    self.stats['standard_reference'] += 1
            
            # TYPE 3: Procedure context
            for procedure in procedures[:2]:  # First 2 procedures per document
                if len(procedure) > 10:
                    self.training_pairs.append({
                        'type': 'procedure',
                        'prompt': f"Describe the {procedure[:50]}",
                        'completion': f"The {procedure} as described in {doc['filename']}: {text[:300]}...",
                        'source': doc['filename'],
                        'metadata': {
                            'procedure': procedure[:100]
                        }
                    })
                    self.stats['procedure'] += 1
            
            # TYPE 4: Definition pairs
            for term, definition in definitions[:3]:  # First 3 definitions per document
                if term and definition and len(definition) > 10:
                    self.training_pairs.append({
                        'type': 'definition',
                        'prompt': f"What is {term}?",
                        'completion': f"{term} {definition}",
                        'source': doc['filename'],
                        'metadata': {
                            'term': term,
                            'definition_length': len(definition)
                        }
                    })
                    self.stats['definition'] += 1
            
            # TYPE 5: Quality-focused Q&A from text chunks
            chunks = self.chunk_text(text, chunk_size=500)
            for chunk in chunks[:5]:  # First 5 chunks
                quality_question = self.generate_quality_question(chunk)
                if quality_question:
                    self.training_pairs.append({
                        'type': 'quality_qa',
                        'prompt': quality_question,
                        'completion': chunk,
                        'source': doc['filename'],
                        'metadata': {
                            'chunk_length': len(chunk)
                        }
                    })
                    self.stats['quality_qa'] += 1
            
            pairs_added = len(self.training_pairs) - pairs_before
            print(f"   ✅ Generated {pairs_added} training pairs")
        
        self.stats['total'] = len(self.training_pairs)
        
        # Save training data
        self.save_training_data()
        
        return len(self.training_pairs)
    
    def extract_clause_context(self, text: str, clause: str, context_size: int = 400) -> str:
        """Extract context around a clause reference"""
        idx = text.find(clause)
        if idx == -1:
            return ""
        
        start = max(0, idx - 200)
        end = min(len(text), idx + context_size)
        context = text[start:end].strip()
        
        # Clean up context
        context = re.sub(r'\s+', ' ', context)
        if len(context) < 50:
            return ""
        
        return context[:500]  # Limit length
    
    def extract_standard_context(self, text: str, standard: str) -> str:
        """Extract context mentioning a standard"""
        # Find first mention of standard
        pattern = re.compile(re.escape(standard), re.IGNORECASE)
        match = pattern.search(text)
        
        if not match:
            return f"Key requirements include: {text[:200]}..."
        
        start = max(0, match.start() - 100)
        end = min(len(text), match.end() + 300)
        context = text[start:end].strip()
        
        return context[:300]
    
    def find_standard_for_clause(self, text: str, clause: str) -> Optional[str]:
        """Try to find which standard a clause belongs to"""
        # Look for standards near the clause
        clause_idx = text.find(clause)
        if clause_idx == -1:
            return None
        
        # Search 500 chars before clause
        search_text = text[max(0, clause_idx - 500):clause_idx]
        
        standards_pattern = r'(AS9100[A-D]?|ISO\s*\d+|IATF\s*\d+|FAA|CASA|EASA)'
        matches = re.findall(standards_pattern, search_text, re.IGNORECASE)
        
        return matches[0] if matches else None
    
    def chunk_text(self, text: str, chunk_size: int = 500) -> List[str]:
        """Break text into overlapping chunks"""
        chunks = []
        
        # Split by sentences first
        sentences = re.split(r'[.!?]+\s+', text)
        
        current_chunk = ""
        for sentence in sentences:
            if len(current_chunk) + len(sentence) < chunk_size:
                current_chunk += sentence + ". "
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + ". "
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def generate_quality_question(self, text: str) -> Optional[str]:
        """Generate a quality-focused question from text"""
        quality_keywords = [
            'requirement', 'shall', 'must', 'process', 'procedure',
            'audit', 'compliance', 'standard', 'clause', 'nonconformity',
            'corrective action', 'preventive action', 'quality', 'documentation'
        ]
        
        text_lower = text.lower()
        found_keywords = [kw for kw in quality_keywords if kw in text_lower]
        
        if not found_keywords:
            return None
        
        # Generate question based on content
        if 'requirement' in text_lower or 'shall' in text_lower or 'must' in text_lower:
            return f"What is required based on this quality requirement? Context: {text[:100]}..."
        elif 'procedure' in text_lower or 'process' in text_lower:
            return f"Describe this quality procedure: {text[:100]}..."
        elif 'audit' in text_lower:
            return f"What should an auditor look for regarding: {text[:100]}..."
        elif 'compliance' in text_lower:
            return f"How do we ensure compliance with: {text[:100]}..."
        else:
            return f"Explain this quality requirement: {text[:100]}..."
    
    def save_training_data(self):
        """Save as JSONL format (one JSON per line)"""
        with open(self.output_file, 'w', encoding='utf-8') as f:
            for pair in self.training_pairs:
                f.write(json.dumps(pair, ensure_ascii=False) + '\n')
        
        print("\n" + "="*60)
        print("✅ Training Data Generation Complete")
        print("="*60)
        print(f"   📊 Total training pairs: {self.stats['total']}")
        print(f"   💾 Output file: {self.output_file}")
        print()
        print("📈 Training data breakdown:")
        for t, count in sorted(self.stats.items(), key=lambda x: x[1], reverse=True):
            if t != 'total':
                percentage = (count / self.stats['total'] * 100) if self.stats['total'] > 0 else 0
                print(f"   {t:20s}: {count:5d} ({percentage:5.1f}%)")
        print("="*60)


def main():
    parser = argparse.ArgumentParser(
        description='Generate training data from parsed documents',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate from default parsed documents
  python create-training-data.py --input ./data/parsed/parsed_documents.json --output ./data/training/training_data.jsonl
  
  # Custom paths
  python create-training-data.py -i parsed.json -o training.jsonl
        """
    )
    
    parser.add_argument(
        '-i', '--input',
        default='./data/parsed/parsed_documents.json',
        help='Input parsed documents JSON file (default: ./data/parsed/parsed_documents.json)'
    )
    
    parser.add_argument(
        '-o', '--output',
        default='./data/training/training_data.jsonl',
        help='Output training data JSONL file (default: ./data/training/training_data.jsonl)'
    )
    
    args = parser.parse_args()
    
    print("="*60)
    print("Training Data Generator for EDCAT Vera")
    print("="*60)
    print()
    
    generator = TrainingDataGenerator(args.input, args.output)
    count = generator.generate_training_data()
    
    if count > 0:
        print(f"\n✅ Created {count:,} training pairs from your quality documents!")
        print(f"📁 Training data ready for fine-tuning")
        print(f"\n💡 Next steps:")
        print(f"   1. Review training data: head -20 {args.output}")
        print(f"   2. Use for LLM fine-tuning or Vera knowledge base")
    else:
        print("\n⚠️  No training pairs generated. Check input file and document content.")


if __name__ == "__main__":
    main()

