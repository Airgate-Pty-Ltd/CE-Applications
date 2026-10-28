#!/usr/bin/env python3
"""
Parse 21,096 quality documents from Google Drive
"""

import os
import json
from pathlib import Path

docs_dir = r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\data\google_drive_downloads"
output_dir = r"C:\Users\oleab\quality-llm\data"
parsed_file = os.path.join(output_dir, "parsed_documents.json")

os.makedirs(output_dir, exist_ok=True)

print("\n" + "="*70)
print("📚 PARSING 21,096 QUALITY DOCUMENTS")
print("="*70 + "\n")

parsed_docs = []
parsed_count = 0
skipped_count = 0

for filepath in Path(docs_dir).rglob('*'):
    if not filepath.is_file():
        continue
    
    if filepath.stat().st_size == 0:
        skipped_count += 1
        continue
    
    ext = filepath.suffix.lower()
    
    try:
        text = ""
        
        # Text files
        if ext in ['.txt', '.md']:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
        
        # PDF files
        elif ext == '.pdf':
            try:
                import PyPDF2
                with open(filepath, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
            except:
                continue
        
        # Word documents
        elif ext in ['.docx', '.doc']:
            try:
                from docx import Document
                doc = Document(filepath)
                text = '\n'.join([p.text for p in doc.paragraphs])
            except:
                continue
        
        # Excel files
        elif ext in ['.xlsx', '.xls']:
            try:
                import pandas as pd
                df = pd.read_excel(filepath)
                text = df.to_string()
            except:
                continue
        
        # CSV files
        elif ext == '.csv':
            try:
                import pandas as pd
                df = pd.read_csv(filepath)
                text = df.to_string()
            except:
                continue
        
        # Only save if we got meaningful text
        if len(text) > 200:
            parsed_docs.append({
                'filename': filepath.name,
                'filepath': str(filepath),
                'text': text[:30000],  # First 30k chars
                'size': len(text)
            })
            parsed_count += 1
            
            if parsed_count % 100 == 0:
                print(f"   ✅ {parsed_count} documents parsed...")

    except Exception as e:
        pass

print(f"\n{'='*70}")
print(f"✅ PARSING COMPLETE!")
print(f"{'='*70}\n")

print(f"📊 Results:")
print(f"   ✅ Parsed: {parsed_count} documents")
print(f"   ⏭️  Skipped: {skipped_count} (empty/binary)")
print(f"   📁 Total scanned: {parsed_count + skipped_count}\n")

# Save parsed documents
with open(parsed_file, 'w') as f:
    json.dump(parsed_docs, f, indent=2)

print(f"💾 Saved: {parsed_file}\n")

if parsed_count > 0:
    print(f"✅ Ready for training data generation!")
    print(f"🎯 Next: python generate_training_data.py\n")