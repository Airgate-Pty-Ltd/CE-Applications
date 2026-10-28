#!/usr/bin/env python3
import os
import json
from pathlib import Path
from collections import defaultdict

quality_sources = [
    "D:\\",
    r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\data\quality_docs_all",
    r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\backend\EDCAT AIP\Requirements",
]

parsed_file = r"C:\Users\oleab\quality-llm\data\parsed_all_comprehensive.json"

print("\n" + "="*80)
print("VERIFYING PARSING COVERAGE")
print("="*80 + "\n")

# Count actual files in sources
print("FILES IN SOURCE FOLDERS:\n")

target_extensions = {'.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.md', '.pptx', '.ppt', '.rtf', '.dotx', '.xlsm', '.htm', '.html'}

source_files = {}
total_source_files = 0

for source in quality_sources:
    if not os.path.exists(source):
        print(f"  ⚠️  {source} - NOT FOUND")
        continue
    
    print(f"  📁 {source}")
    
    file_count = 0
    ext_count = defaultdict(int)
    
    for filepath in Path(source).rglob('*'):
        if not filepath.is_file():
            continue
        
        if filepath.stat().st_size == 0:
            continue
        
        ext = filepath.suffix.lower()
        
        if ext not in target_extensions:
            continue
        
        if any(skip in str(filepath).lower() for skip in ['node_modules', '.git', '__pycache__']):
            continue
        
        file_count += 1
        ext_count[ext] += 1
        total_source_files += 1
    
    source_files[source] = file_count
    
    print(f"     Total files (parseable): {file_count}")
    print(f"     By extension:")
    for ext in sorted(ext_count.keys(), key=lambda x: ext_count[x], reverse=True):
        print(f"       {ext}: {ext_count[ext]}")
    print()

print(f"  TOTAL SOURCE FILES: {total_source_files}\n")

# Count parsed files
print("="*80)
print("PARSED DOCUMENTS:\n")

with open(parsed_file, 'r') as f:
    parsed_docs = json.load(f)

print(f"  Total parsed: {len(parsed_docs)}\n")

# Breakdown by source
parsed_by_source = defaultdict(int)
for doc in parsed_docs:
    parsed_by_source[doc['source']] += 1

print("  By source:")
for source in quality_sources:
    count = parsed_by_source.get(source, 0)
    expected = source_files.get(source, 0)
    
    if expected > 0:
        percentage = (count / expected) * 100
        status = "✅" if percentage > 95 else "⚠️"
        print(f"    {status} {source}")
        print(f"       Parsed: {count} / Expected: {expected} ({percentage:.1f}%)")
    else:
        print(f"    ⚠️  {source} - No files found")

print("\n" + "="*80)
print("SUMMARY:\n")

total_expected = total_source_files
total_parsed = len(parsed_docs)
coverage = (total_parsed / total_expected * 100) if total_expected > 0 else 0

print(f"  Expected files: {total_expected}")
print(f"  Parsed documents: {total_parsed}")
print(f"  Coverage: {coverage:.1f}%")
print(f"  Missing: {total_expected - total_parsed}\n")

if coverage > 95:
    print("  ✅ EXCELLENT COVERAGE!\n")
elif coverage > 80:
    print("  ✅ GOOD COVERAGE - Some files may be unreadable\n")
else:
    print("  ⚠️  LOW COVERAGE - Check for issues\n")

print("="*80 + "\n")