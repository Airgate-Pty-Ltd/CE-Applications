#!/usr/bin/env python3
"""
Inspect Training Data

Validates that training data contains actual Google Drive documents,
not just Vera's existing data. Helps identify if fine-tuning will work.

Usage:
    python inspect-training-data.py --data ./data/training/training_data.jsonl
"""

import os
import sys
import json
import argparse
from pathlib import Path
from collections import Counter
from typing import Dict, List


def inspect_training_data(data_file: str) -> Dict:
    """Inspect training data to validate content"""
    
    print("="*70)
    print("Training Data Inspection")
    print("="*70)
    print()
    
    if not os.path.exists(data_file):
        print(f"❌ Training data file not found: {data_file}")
        return {}
    
    # Read all training pairs
    training_pairs = []
    sources = []
    types = []
    
    print(f"📚 Reading training data from: {data_file}")
    
    with open(data_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            if line.strip():
                try:
                    pair = json.loads(line)
                    training_pairs.append(pair)
                    sources.append(pair.get('source', 'unknown'))
                    types.append(pair.get('type', 'unknown'))
                except json.JSONDecodeError as e:
                    print(f"⚠️  Skipping invalid JSON on line {line_num}: {e}")
    
    total_pairs = len(training_pairs)
    
    print(f"✅ Loaded {total_pairs:,} training pairs\n")
    
    # Analyze sources
    source_counter = Counter(sources)
    unique_sources = len(source_counter)
    
    print("="*70)
    print("Source Analysis")
    print("="*70)
    print(f"   📊 Total training pairs: {total_pairs:,}")
    print(f"   📁 Unique source files: {unique_sources}")
    print()
    
    # Check for Google Drive documents
    google_drive_indicators = [
        'google', 'drive', '.pdf', '.docx', '.xlsx',
        'as9100', 'iso', 'faa', 'casa', 'procedure',
        'standard', 'requirement', 'quality'
    ]
    
    google_drive_sources = []
    vera_sources = []
    unknown_sources = []
    
    for source in source_counter.keys():
        source_lower = source.lower()
        if any(indicator in source_lower for indicator in google_drive_indicators):
            google_drive_sources.append(source)
        elif 'vera' in source_lower or 'edcat' in source_lower or 'database' in source_lower:
            vera_sources.append(source)
        else:
            unknown_sources.append(source)
    
    print("📁 Source Classification:")
    print(f"   ✅ Google Drive documents: {len(google_drive_sources)} files")
    print(f"   ⚠️  Vera/EDCAT sources: {len(vera_sources)} files")
    print(f"   ❓ Unknown sources: {len(unknown_sources)} files")
    print()
    
    # Show top sources
    print("📊 Top 10 Source Files:")
    for source, count in source_counter.most_common(10):
        classification = "✅" if source in google_drive_sources else ("⚠️" if source in vera_sources else "❓")
        print(f"   {classification} {source}: {count} pairs")
    print()
    
    # Analyze types
    type_counter = Counter(types)
    print("📊 Training Pair Types:")
    for pair_type, count in type_counter.most_common():
        percentage = (count / total_pairs * 100) if total_pairs > 0 else 0
        print(f"   {pair_type}: {count:,} ({percentage:.1f}%)")
    print()
    
    # Sample inspection
    print("="*70)
    print("Sample Training Pairs")
    print("="*70)
    print()
    
    for idx, pair in enumerate(training_pairs[:5], 1):
        print(f"[{idx}] Type: {pair.get('type', 'unknown')}")
        print(f"     Source: {pair.get('source', 'unknown')}")
        print(f"     Prompt: {pair.get('prompt', '')[:80]}...")
        print(f"     Completion: {pair.get('completion', '')[:80]}...")
        print()
    
    # Validation
    print("="*70)
    print("Validation Results")
    print("="*70)
    print()
    
    issues = []
    warnings = []
    
    # Check 1: Total pairs
    if total_pairs < 1000:
        issues.append(f"⚠️  Too few training pairs: {total_pairs:,} (recommend 5,000+)")
    elif total_pairs < 5000:
        warnings.append(f"📊 Moderate training pairs: {total_pairs:,} (recommend 10,000+ for best results)")
    else:
        print(f"✅ Good number of training pairs: {total_pairs:,}")
    
    # Check 2: Google Drive sources
    google_drive_pairs = sum(source_counter[s] for s in google_drive_sources)
    google_drive_percentage = (google_drive_pairs / total_pairs * 100) if total_pairs > 0 else 0
    
    if google_drive_percentage < 50:
        issues.append(f"⚠️  Low Google Drive content: {google_drive_percentage:.1f}% (recommend 70%+)")
    elif google_drive_percentage < 70:
        warnings.append(f"📊 Moderate Google Drive content: {google_drive_percentage:.1f}% (recommend 70%+)")
    else:
        print(f"✅ Good Google Drive content: {google_drive_percentage:.1f}%")
    
    # Check 3: Vera sources
    vera_pairs = sum(source_counter[s] for s in vera_sources)
    vera_percentage = (vera_pairs / total_pairs * 100) if total_pairs > 0 else 0
    
    if vera_percentage > 50:
        issues.append(f"⚠️  Too much Vera data: {vera_percentage:.1f}% (should be < 30%)")
    elif vera_percentage > 30:
        warnings.append(f"📊 High Vera data: {vera_percentage:.1f}% (recommend < 30%)")
    else:
        print(f"✅ Low Vera data: {vera_percentage:.1f}%")
    
    # Check 4: Type diversity
    if len(type_counter) < 3:
        warnings.append(f"📊 Limited type diversity: {len(type_counter)} types (recommend 4+)")
    else:
        print(f"✅ Good type diversity: {len(type_counter)} types")
    
    # Print issues and warnings
    if issues:
        print()
        print("❌ Issues Found:")
        for issue in issues:
            print(f"   {issue}")
    
    if warnings:
        print()
        print("⚠️  Warnings:")
        for warning in warnings:
            print(f"   {warning}")
    
    # Final assessment
    print()
    print("="*70)
    print("Final Assessment")
    print("="*70)
    
    if issues:
        print("❌ TRAINING DATA HAS ISSUES")
        print()
        print("💡 Recommendations:")
        print("   1. Extract more documents from Google Drive")
        print("   2. Run parse-documents.py on more files")
        print("   3. Generate more training pairs")
        print("   4. Verify source files are from YOUR documents, not Vera's database")
    elif warnings:
        print("⚠️  TRAINING DATA IS ACCEPTABLE")
        print()
        print("💡 Recommendations:")
        print("   1. Add more Google Drive documents for better results")
        print("   2. Current data should work but may not be optimal")
    else:
        print("✅ TRAINING DATA LOOKS GOOD")
        print()
        print("💡 Ready for fine-tuning!")
        print("   Your training data contains:")
        print(f"   - {total_pairs:,} training pairs")
        print(f"   - {google_drive_percentage:.1f}% from Google Drive documents")
        print(f"   - {len(type_counter)} different types")
    
    print("="*70)
    
    return {
        'total_pairs': total_pairs,
        'unique_sources': unique_sources,
        'google_drive_sources': len(google_drive_sources),
        'google_drive_percentage': google_drive_percentage,
        'vera_sources': len(vera_sources),
        'vera_percentage': vera_percentage,
        'types': len(type_counter),
        'issues': len(issues),
        'warnings': len(warnings)
    }


def main():
    parser = argparse.ArgumentParser(
        description='Inspect training data to validate content',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Inspect training data
  python inspect-training-data.py --data ./data/training/training_data.jsonl
  
  # Save results to JSON
  python inspect-training-data.py --data training.jsonl --output results.json
        """
    )
    
    parser.add_argument(
        '--data',
        required=True,
        help='Path to training data JSONL file'
    )
    
    parser.add_argument(
        '--output',
        help='Save inspection results to JSON file'
    )
    
    args = parser.parse_args()
    
    try:
        results = inspect_training_data(args.data)
        
        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"\n💾 Results saved to: {args.output}")
        
    except Exception as e:
        print(f"\n❌ Inspection failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

