#!/usr/bin/env python3
"""
Google Drive Document Extractor for EDCAT Vera
Extracts documents from Google Drive folders and prepares them for Vera ingestion

Usage:
    python extract-google-drive-documents.py --folder-id FOLDER_ID --output-dir ./data/raw_documents

Requirements:
    pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client
"""

import os
import sys
import argparse
import json
from pathlib import Path
from typing import List, Dict, Optional

try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaIoBaseDownload
    from googleapiclient.errors import HttpError
except ImportError:
    print("❌ Missing required packages. Install with:")
    print("   pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client")
    sys.exit(1)

# Google Drive API scopes
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

# Supported file types
SUPPORTED_TYPES = {
    'application/pdf': 'pdf',
    'application/vnd.google-apps.document': 'pdf',  # Google Docs → PDF
    'application/vnd.google-apps.spreadsheet': 'csv',  # Google Sheets → CSV
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/csv': 'csv',
    'text/plain': 'txt',
}


def authenticate_google_drive(credentials_file: str = 'credentials.json', token_file: str = 'token.json') -> Optional[object]:
    """
    Authenticate with Google Drive API
    
    Args:
        credentials_file: Path to OAuth2 credentials JSON file
        token_file: Path to store/load token
    
    Returns:
        Google Drive service object or None if authentication fails
    """
    creds = None
    
    # Load existing token
    if os.path.exists(token_file):
        try:
            creds = Credentials.from_authorized_user_file(token_file, SCOPES)
        except Exception as e:
            print(f"⚠️  Error loading token: {e}")
    
    # If no valid credentials, authenticate
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"⚠️  Error refreshing token: {e}")
                creds = None
        
        if not creds:
            if not os.path.exists(credentials_file):
                print(f"❌ Credentials file not found: {credentials_file}")
                print("\n📋 To get credentials:")
                print("1. Go to https://console.cloud.google.com/")
                print("2. Create a new project or select existing")
                print("3. Enable Google Drive API")
                print("4. Create OAuth 2.0 credentials (Desktop app)")
                print("5. Download credentials.json and place in this directory")
                return None
            
            try:
                flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
                creds = flow.run_local_server(port=0)
            except Exception as e:
                print(f"❌ Authentication failed: {e}")
                return None
        
        # Save token for future use
        try:
            with open(token_file, 'w') as token:
                token.write(creds.to_json())
        except Exception as e:
            print(f"⚠️  Warning: Could not save token: {e}")
    
    try:
        service = build('drive', 'v3', credentials=creds)
        return service
    except Exception as e:
        print(f"❌ Error building Drive service: {e}")
        return None


def download_file(service, file_id: str, file_name: str, output_dir: str, mime_type: str) -> bool:
    """
    Download a file from Google Drive
    
    Args:
        service: Google Drive service object
        file_id: Google Drive file ID
        file_name: Name of the file
        output_dir: Output directory path
        mime_type: MIME type of the file
    
    Returns:
        True if successful, False otherwise
    """
    try:
        # Determine export format
        export_mime = None
        output_ext = None
        
        if 'application/vnd.google-apps.document' in mime_type:
            export_mime = 'application/pdf'
            output_ext = '.pdf'
        elif 'application/vnd.google-apps.spreadsheet' in mime_type:
            export_mime = 'text/csv'
            output_ext = '.csv'
        elif 'application/pdf' in mime_type:
            export_mime = None  # Direct download
            output_ext = '.pdf'
        elif 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' in mime_type:
            export_mime = None
            output_ext = '.docx'
        elif 'text/csv' in mime_type:
            export_mime = None
            output_ext = '.csv'
        else:
            print(f"⚠️  Unsupported file type: {mime_type} for {file_name}")
            return False
        
        # Clean filename
        safe_name = "".join(c for c in file_name if c.isalnum() or c in (' ', '-', '_', '.')).rstrip()
        if output_ext and not safe_name.endswith(output_ext):
            safe_name = safe_name + output_ext
        
        output_path = os.path.join(output_dir, safe_name)
        
        # Download or export
        if export_mime:
            # Export Google Docs/Sheets
            request = service.files().export_media(fileId=file_id, mimeType=export_mime)
        else:
            # Direct download
            request = service.files().get_media(fileId=file_id)
        
        # Download file
        with open(output_path, 'wb') as f:
            downloader = MediaIoBaseDownload(f, request)
            done = False
            while not done:
                status, done = downloader.next_chunk()
                if status:
                    print(f"   📥 Progress: {int(status.progress() * 100)}%", end='\r')
        
        print(f"   ✅ Downloaded: {safe_name}")
        return True
        
    except HttpError as e:
        print(f"   ❌ HTTP Error downloading {file_name}: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Error downloading {file_name}: {e}")
        return False


def extract_google_drive_documents(folder_id: str, output_dir: str, service: object) -> Dict[str, int]:
    """
    Extract all documents from Google Drive folder
    
    Args:
        folder_id: Google Drive folder ID
        output_dir: Output directory path
        service: Google Drive service object
    
    Returns:
        Dictionary with extraction statistics
    """
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Query all files in folder
    query = f"'{folder_id}' in parents and trashed=false"
    
    all_files = []
    page_token = None
    
    print(f"🔍 Searching for files in Google Drive folder: {folder_id}")
    
    try:
        while True:
            results = service.files().list(
                q=query,
                pageSize=1000,
                fields="nextPageToken, files(id, name, mimeType, size, modifiedTime)",
                pageToken=page_token
            ).execute()
            
            files = results.get('files', [])
            all_files.extend(files)
            
            page_token = results.get('nextPageToken')
            if not page_token:
                break
            
            print(f"   📄 Found {len(all_files)} files so far...", end='\r')
        
        print(f"\n📁 Found {len(all_files)} files in Google Drive folder")
        
        extracted_count = 0
        skipped_count = 0
        error_count = 0
        
        for idx, file in enumerate(all_files, 1):
            file_id = file['id']
            file_name = file['name']
            mime_type = file.get('mimeType', '')
            
            print(f"\n[{idx}/{len(all_files)}] Processing: {file_name}")
            
            if download_file(service, file_id, file_name, output_dir, mime_type):
                extracted_count += 1
            else:
                if mime_type in SUPPORTED_TYPES:
                    error_count += 1
                else:
                    skipped_count += 1
        
        print(f"\n{'='*60}")
        print(f"✅ Extraction complete!")
        print(f"   📥 Extracted: {extracted_count} files")
        print(f"   ⏭️  Skipped (unsupported): {skipped_count} files")
        print(f"   ❌ Errors: {error_count} files")
        print(f"   📁 Output directory: {output_dir}")
        print(f"{'='*60}")
        
        return {
            'total': len(all_files),
            'extracted': extracted_count,
            'skipped': skipped_count,
            'errors': error_count
        }
        
    except HttpError as e:
        print(f"❌ HTTP Error accessing Google Drive: {e}")
        return {'error': str(e)}
    except Exception as e:
        print(f"❌ Error extracting documents: {e}")
        return {'error': str(e)}


def main():
    parser = argparse.ArgumentParser(
        description='Extract documents from Google Drive for Vera ingestion',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Extract from folder ID
  python extract-google-drive-documents.py --folder-id 1ABC123xyz --output-dir ./data/raw_documents
  
  # Use custom credentials file
  python extract-google-drive-documents.py --folder-id 1ABC123xyz --credentials ./my-credentials.json

Getting Google Drive Folder ID:
  1. Open Google Drive in browser
  2. Navigate to your folder
  3. Copy the folder ID from the URL:
     https://drive.google.com/drive/folders/FOLDER_ID_HERE
        """
    )
    
    parser.add_argument(
        '--folder-id',
        required=True,
        help='Google Drive folder ID (from URL: drive.google.com/drive/folders/FOLDER_ID)'
    )
    
    parser.add_argument(
        '--output-dir',
        default='./data/raw_documents',
        help='Output directory for extracted documents (default: ./data/raw_documents)'
    )
    
    parser.add_argument(
        '--credentials',
        default='credentials.json',
        help='Path to OAuth2 credentials JSON file (default: credentials.json)'
    )
    
    parser.add_argument(
        '--token',
        default='token.json',
        help='Path to store/load OAuth2 token (default: token.json)'
    )
    
    args = parser.parse_args()
    
    print("="*60)
    print("Google Drive Document Extractor for EDCAT Vera")
    print("="*60)
    print()
    
    # Authenticate
    print("🔐 Authenticating with Google Drive API...")
    service = authenticate_google_drive(args.credentials, args.token)
    
    if not service:
        print("\n❌ Authentication failed. Please check your credentials.")
        sys.exit(1)
    
    print("✅ Authentication successful!")
    print()
    
    # Extract documents
    results = extract_google_drive_documents(args.folder_id, args.output_dir, service)
    
    if 'error' in results:
        print(f"\n❌ Extraction failed: {results['error']}")
        sys.exit(1)
    
    # Save extraction report
    report_path = os.path.join(args.output_dir, 'extraction_report.json')
    with open(report_path, 'w') as f:
        json.dump({
            'folder_id': args.folder_id,
            'output_dir': args.output_dir,
            'results': results,
            'timestamp': __import__('datetime').datetime.now().isoformat()
        }, f, indent=2)
    
    print(f"\n📊 Extraction report saved to: {report_path}")
    print("\n✅ Next steps:")
    print("   1. Review extracted documents in:", args.output_dir)
    print("   2. Run Vera ingestion script to process documents")
    print("   3. Documents will be available for Vera to query")


if __name__ == "__main__":
    main()

