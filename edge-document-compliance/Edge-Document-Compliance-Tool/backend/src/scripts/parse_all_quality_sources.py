#!/usr/bin/env python3
"""
Parse ALL quality documents from multiple sources
"""

import os
import json
from pathlib import Path

quality_sources = [
    "D:\\",
    r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\data\quality_docs_all",
    r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\backend\EDCAT AIP\Requirements",
]

output_dir = r"C:\Users\oleab\quality-llm\data"
parsed_file = os.path.join(output_dir, "parsed_all_documents.json")

os.makedirs(output_dir, exist_ok=True)

print("\n" + "="*70)
print("PARSING ALL QUALITY DOCUMENT SOURCES")
print("="*70)
print("\nSources:")
for source in quality_sources:
    print(f"  {source}")
print("\n" + "="*70 + "\n")

parsed_docs = []
parsed_count = 0
skipped_count = 0
processed_sources = set()

target_extensions = {'.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.md', '.pptx'}

for source in quality_sources:
    if not os.path.exists(source):
        print(f"Warning: Source not found: {source}")
        continue
    
    print(f"\nProcessing: {source}")
    
    for filepath in Path(source).rglob('*'):
        if not filepath.is_file():
            continue
        
        if filepath.stat().st_size == 0:
            skipped_count += 1
            continue
        
        ext = filepath.suffix.lower()
        
        if ext not in target_extensions:
            continue
        
        if any(skip in str(filepath).lower() for skip in ['node_modules', '.git', '__pycache__', '.venv', 'venv']):
            continue
        
        try:
            text = ""
            
            if ext in ['.txt', '.md']:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    text = f.read()
            
            elif ext == '.pdf':
                try:
                    import PyPDF2
                    with open(filepath, 'rb') as f:
                        reader = PyPDF2.PdfReader(f)
                        for page in reader.pages:
                            text += page.extract_text() + "\n"
                except:
                    continue
            
            elif ext in ['.docx', '.doc']:
                try:
                    from docx import Document
                    doc = Document(filepath)
                    text = '\n'.join([p.text for p in doc.paragraphs])
                except:
                    continue
            
            elif ext in ['.xlsx', '.xls']:
                try:
                    import pandas as pd
                    df = pd.read_excel(filepath)
                    text = df.to_string()
                except:
                    continue
            
            elif ext == '.csv':
                try:
                    import pandas as pd
                    df = pd.read_csv(filepath)
                    text = df.to_string()
                except:
                    continue
            
            elif ext == '.pptx':
                try:
                    from pptx import Presentation
                    prs = Presentation(filepath)
                    for slide in prs.slides:
                        for shape in slide.shapes:
                            if hasattr(shape, "text"):
                                text += shape.text + "\n"
                except:
                    continue
            
            if len(text) > 200:
                parsed_docs.append({
                    'filename': filepath.name,
                    'filepath': str(filepath),
                    'source': source,
                    'text': text[:30000],
                    'size': len(text)
                })
                parsed_count += 1
                
                if parsed_count % 100 == 0:
                    print(f"   Parsed {parsed_count} documents...")

        except Exception as e:
            pass

print("\n" + "="*70)
print("PARSING COMPLETE")
print("="*70 + "\n")

print("Results:")
print(f"   Total parsed: {parsed_count} documents")
print(f"   Skipped: {skipped_count} (empty/binary)\n")

for doc in parsed_docs:
    source = doc['source']
    if source not in processed_sources:
        processed_sources.add(source)
        count = sum(1 for d in parsed_docs if d['source'] == source)
        print(f"   {source}: {count} documents")

print()

with open(parsed_file, 'w') as f:
    json.dump(parsed_docs, f, indent=2)

print(f"Saved: {parsed_file}\n")

if parsed_count > 0:
    print("Ready for training data generation!\n")