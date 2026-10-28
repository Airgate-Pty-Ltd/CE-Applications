#!/usr/bin/env python3
import json
import re

parsed_file = r"C:\Users\oleab\quality-llm\data\parsed_all_comprehensive.json"
training_file = r"C:\Users\oleab\quality-llm\data\training_data_final.jsonl"

print("\nGenerating training data from 22,437 documents...\n")

with open(parsed_file, 'r') as f:
    documents = json.load(f)

training_pairs = []

for doc in documents:
    text = doc['text']
    filename = doc['filename']
    
    if len(text) < 100:
        continue
    
    # Extract standards
    standards = re.findall(r'(AS9100|AS9110|AS9120|ISO\s*9001|ISO\s*13485|IATF|FAA|CASA|EASA|FDA)', text, re.IGNORECASE)
    for std in list(set(standards))[:3]:
        training_pairs.append({
            'prompt': f"Explain {std}",
            'completion': f"{std} requirements from {filename}: {text[:250]}"
        })
    
    # Extract procedures
    if any(kw in text.lower() for kw in ['procedure', 'process', 'requirement', 'shall', 'must']):
        chunks = text.split('\n')
        for chunk in chunks[:5]:
            if 100 < len(chunk) < 500 and any(kw in chunk.lower() for kw in ['procedure', 'process', 'requirement']):
                training_pairs.append({
                    'prompt': "What is this quality requirement?",
                    'completion': chunk
                })
    
    # General Q&A
    if len(text) > 200:
        training_pairs.append({
            'prompt': f"What does {filename} contain?",
            'completion': text[:400]
        })

with open(training_file, 'w') as f:
    for pair in training_pairs:
        f.write(json.dumps(pair) + '\n')

print(f"Generated {len(training_pairs)} training pairs")
print(f"Saved: {training_file}\n")