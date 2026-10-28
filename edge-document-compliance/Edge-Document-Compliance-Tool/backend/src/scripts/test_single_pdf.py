#!/usr/bin/env python3
import os
from pathlib import Path

google_drive_folder = r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\data\quality_docs_all"

print("Looking for first PDF...\n")

# Find first PDF
found = False
for filepath in Path(google_drive_folder).rglob('*.pdf'):
    if filepath.stat().st_size > 0:
        print(f"Found PDF: {filepath.name}")
        print(f"Size: {filepath.stat().st_size} bytes")
        print(f"Full path: {filepath}\n")
        
        try:
            import PyPDF2
            print("Attempting to parse...")
            with open(filepath, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                num_pages = len(reader.pages)
                print(f"Pages: {num_pages}")
                
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                
                print(f"Extracted text length: {len(text)} characters")
                if len(text) > 0:
                    print(f"\nFirst 200 characters:")
                    print(text[:200])
                    print("\nSUCCESS - PDF parsed!")
                else:
                    print("\nFAILED - No text extracted")
        
        except Exception as e:
            print(f"ERROR: {e}")
        
        found = True
        break

if not found:
    print("No PDFs found!")