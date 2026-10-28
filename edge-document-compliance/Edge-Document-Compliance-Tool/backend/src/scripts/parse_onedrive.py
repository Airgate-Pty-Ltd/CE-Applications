#!/usr/bin/env python3
import os
import json
from pathlib import Path

docs_dir = r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator"
output_dir = r"C:\Users\oleab\quality-llm\data"
parsed_file = os.path.join(output_dir, "parsed_documents.json")

os.makedirs(output_dir, exist_ok=True)

print("\n" + "="*70)
print("📚 PARSING YOUR ONEDRIVE DOCUMENTS")
print("="*70 + "\n")

parsed_docs = []
parsed_count = 0

skip_folders = ['node_modules', '.git', '__pycache__', 'backend/src/scripts', '.venv']

for filepath in Path(docs_dir).rglob('*'):
    if not filepath.is_file():
        continue
    
    path_str = str(filepath).lower()
    if any(skip in path_str for skip in skip_folders):
        continue
    
    if filepath.stat().st_size == 0:
        continue
    
    ext = filepath.suffix.lower()
    
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
        
        elif ext == '.docx':
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
        
        if len(text) > 100:
            parsed_docs.append({
                'filename': filepath.name,
                'filepath': str(filepath),
                'text': text[:20000],
                'size': len(text)
            })
            parsed_count += 1
            
            if parsed_count % 10 == 0:
                print(f"   ✅ {parsed_count} documents parsed...")

    except Exception as e:
        pass

print(f"\n{'='*70}")
print(f"✅ COMPLETE!")
print(f"{'='*70}\n")

print(f"📊 Parsed {parsed_count} documents from YOUR OneDrive\n")

with open(parsed_file, 'w') as f:
    json.dump(parsed_docs, f, indent=2)

print(f"💾 Saved: {parsed_file}\n")

if parsed_count > 0:
    print(f"🎯 Next: Generate training data from these documents!")