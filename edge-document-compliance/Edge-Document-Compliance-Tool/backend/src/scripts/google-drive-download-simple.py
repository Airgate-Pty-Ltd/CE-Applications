#!/usr/bin/env python3
"""
Simple Google Drive Folder Downloader

Direct downloader for Google Drive folders with minimal setup.
Uses service account or OAuth flow with automatic token management.

Usage:
    python google-drive-download-simple.py --folder-id YOUR_FOLDER_ID
    python google-drive-download-simple.py --config .config/google_drive_config.json
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Optional

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


def load_config(config_file: str) -> dict:
    """Load configuration from JSON file"""
    if not os.path.exists(config_file):
        return {}
    
    with open(config_file, 'r') as f:
        return json.load(f)


def authenticate_google_drive(credentials_file: str = 'credentials.json', token_file: str = 'token.json'):
    """Authenticate with Google Drive API (simplified)"""
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
                print("\n📋 Quick Setup:")
                print("1. Go to https://console.cloud.google.com/")
                print("2. Create project or select existing")
                print("3. Enable Google Drive API")
                print("4. Create OAuth 2.0 credentials (Desktop app)")
                print("5. Download as credentials.json")
                return None
            
            try:
                flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
                creds = flow.run_local_server(port=0)
            except Exception as e:
                print(f"❌ Authentication failed: {e}")
                return None
        
        # Save token
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
    """Download a file from Google Drive"""
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
            export_mime = None
            output_ext = '.pdf'
        elif 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' in mime_type:
            export_mime = None
            output_ext = '.docx'
        elif 'text/csv' in mime_type:
            export_mime = None
            output_ext = '.csv'
        else:
            # Try direct download for other types
            export_mime = None
            output_ext = ''
        
        # Clean filename
        safe_name = "".join(c for c in file_name if c.isalnum() or c in (' ', '-', '_', '.')).rstrip()
        if output_ext and not safe_name.endswith(output_ext):
            safe_name = safe_name + output_ext
        
        output_path = os.path.join(output_dir, safe_name)
        
        # Download or export
        if export_mime:
            request = service.files().export_media(fileId=file_id, mimeType=export_mime)
        else:
            request = service.files().get_media(fileId=file_id)
        
        # Download file
        with open(output_path, 'wb') as f:
            downloader = MediaIoBaseDownload(f, request)
            done = False
            while not done:
                status, done = downloader.next_chunk()
                if status:
                    progress = int(status.progress() * 100)
                    print(f"   📥 {progress}%", end='\r')
        
        print(f"   ✅ Downloaded: {safe_name}")
        return True
        
    except HttpError as e:
        print(f"   ❌ HTTP Error: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


def download_google_drive_folder(
    folder_id: str,
    output_dir: str,
    service: object
) -> dict:
    """Download all files from Google Drive folder"""
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"📥 Downloading files from folder: {folder_id}\n")
    
    # Query all files in folder
    query = f"'{folder_id}' in parents and trashed=false"
    
    all_files = []
    page_token = None
    
    print("🔍 Searching for files...")
    
    try:
        while True:
            results = service.files().list(
                q=query,
                pageSize=1000,
                fields="nextPageToken, files(id, name, mimeType, size)",
                pageToken=page_token
            ).execute()
            
            files = results.get('files', [])
            all_files.extend(files)
            
            page_token = results.get('nextPageToken')
            if not page_token:
                break
            
            print(f"   Found {len(all_files)} files so far...", end='\r')
        
        print(f"\n📊 Found {len(all_files)} files in folder\n")
        
        downloaded_count = 0
        skipped_count = 0
        failed_count = 0
        
        for idx, file in enumerate(all_files, 1):
            file_id = file['id']
            file_name = file['name']
            file_size = file.get('size', '?')
            mime_type = file.get('mimeType', '')
            
            print(f"[{idx}/{len(all_files)}] {file_name}")
            if file_size != '?':
                size_mb = int(file_size) / (1024 * 1024)
                print(f"        Size: {size_mb:.2f} MB")
            
            if download_file(service, file_id, file_name, output_dir, mime_type):
                downloaded_count += 1
            else:
                failed_count += 1
        
        print(f"\n{'='*70}")
        print(f"✅ Download Complete!")
        print(f"   📥 Downloaded: {downloaded_count} files")
        print(f"   ❌ Failed: {failed_count} files")
        print(f"   📁 Location: {output_dir}")
        print(f"{'='*70}\n")
        
        return {
            'total': len(all_files),
            'downloaded': downloaded_count,
            'failed': failed_count,
            'output_dir': output_dir
        }
        
    except HttpError as e:
        print(f"❌ HTTP Error accessing Google Drive: {e}")
        return {'error': str(e)}
    except Exception as e:
        print(f"❌ Error: {e}")
        return {'error': str(e)}


def main():
    parser = argparse.ArgumentParser(
        description='Simple Google Drive folder downloader',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Direct folder ID
  python google-drive-download-simple.py --folder-id 1Wk7rZxxq7z8HyWgjyxsaqIZsfYdw5AEY
  
  # Using config file
  python google-drive-download-simple.py --config .config/google_drive_config.json
  
  # From folder URL
  python google-drive-download-simple.py --folder-url "https://drive.google.com/drive/folders/1Wk7rZxxq7z8HyWgjyxsaqIZsfYdw5AEY"
        """
    )
    
    parser.add_argument(
        '--folder-id',
        help='Google Drive folder ID'
    )
    
    parser.add_argument(
        '--folder-url',
        help='Google Drive folder URL (extracts ID automatically)'
    )
    
    parser.add_argument(
        '--config',
        help='Path to config JSON file'
    )
    
    parser.add_argument(
        '--output-dir',
        default='./data/raw_google_drive_documents',
        help='Output directory (default: ./data/raw_google_drive_documents)'
    )
    
    parser.add_argument(
        '--credentials',
        default='credentials.json',
        help='OAuth2 credentials file (default: credentials.json)'
    )
    
    parser.add_argument(
        '--token',
        default='token.json',
        help='Token file (default: token.json)'
    )
    
    args = parser.parse_args()
    
    print("="*70)
    print("Simple Google Drive Folder Downloader")
    print("="*70)
    print()
    
    # Get folder ID
    folder_id = None
    output_dir = args.output_dir
    
    if args.config:
        config = load_config(args.config)
        folder_id = config.get('folder_id')
        if not folder_id and config.get('folder_url'):
            try:
                folder_id = config['folder_url'].split('/folders/')[-1].split('?')[0]
            except:
                pass
        if config.get('output_directory'):
            output_dir = config['output_directory']
        if config.get('credentials_file'):
            args.credentials = config['credentials_file']
        if config.get('token_file'):
            args.token = config.get('token_file', args.token)
    
    if not folder_id:
        if args.folder_id:
            folder_id = args.folder_id
        elif args.folder_url:
            try:
                folder_id = args.folder_url.split('/folders/')[-1].split('?')[0]
            except:
                print("❌ Could not extract folder ID from URL")
                sys.exit(1)
        else:
            print("❌ No folder ID provided")
            print("   Use --folder-id, --folder-url, or --config")
            sys.exit(1)
    
    print(f"📂 Folder ID: {folder_id}")
    print(f"📁 Output directory: {output_dir}")
    print()
    
    # Authenticate
    print("🔐 Authenticating with Google Drive...")
    service = authenticate_google_drive(args.credentials, args.token)
    
    if not service:
        print("\n❌ Authentication failed")
        sys.exit(1)
    
    print("✅ Authentication successful!\n")
    
    # Download
    results = download_google_drive_folder(folder_id, output_dir, service)
    
    if 'error' in results:
        print(f"\n❌ Download failed: {results['error']}")
        sys.exit(1)
    
    print("✅ All done!")
    print(f"\n💡 Next step: Run parse-documents.py on {output_dir}")


if __name__ == "__main__":
    main()

