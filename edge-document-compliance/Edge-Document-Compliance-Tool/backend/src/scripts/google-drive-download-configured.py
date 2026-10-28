#!/usr/bin/env python3
"""
Google Drive Downloader (Configured)

Downloads all files from a Google Drive folder using config file.
Uses the same authentication as google-drive-download-simple.py.
"""

import os
import sys
import json
from pathlib import Path
from typing import Optional

try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
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
        print(f"❌ Config file not found: {config_file}")
        print("\n💡 Create a config file or use:")
        print("   python google-drive-download-simple.py --folder-id YOUR_FOLDER_ID")
        sys.exit(1)
    
    with open(config_file, 'r') as f:
        return json.load(f)


def authenticate_google_drive(token_file: str = 'token.json'):
    """Authenticate with Google Drive API"""
    creds = None
    
    # Load existing token
    if os.path.exists(token_file):
        try:
            creds = Credentials.from_authorized_user_file(token_file, SCOPES)
        except Exception as e:
            print(f"⚠️  Error loading token: {e}")
    
    # If no valid credentials, need to run setup
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                # Save refreshed token
                with open(token_file, 'w') as token:
                    token.write(creds.to_json())
            except Exception as e:
                print(f"⚠️  Error refreshing token: {e}")
                creds = None
        
        if not creds:
            print(f"❌ No valid credentials found: {token_file}")
            print("\n💡 Run setup first:")
            print("   python setup-google-auth.py")
            return None
    
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
            export_mime = None
            output_ext = ''
        
        # Clean filename
        safe_name = "".join(c for c in file_name if c.isalnum() or c in (' ', '-', '_', '.')).rstrip()
        if output_ext and not safe_name.endswith(output_ext):
            safe_name = safe_name + output_ext
        
        output_path = os.path.join(output_dir, safe_name)
        
        # Skip if already exists
        if os.path.exists(output_path):
            print(f"   ⏭️  Skipped (exists): {safe_name}")
            return True
        
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
        
        if len(all_files) == 0:
            print("⚠️  No files found in folder")
            print("   Check folder ID and sharing permissions")
            return {'total': 0, 'downloaded': 0, 'failed': 0}
        
        downloaded_count = 0
        skipped_count = 0
        failed_count = 0
        total_size = 0
        
        for idx, file in enumerate(all_files, 1):
            file_id = file['id']
            file_name = file['name']
            file_size = file.get('size', '0')
            mime_type = file.get('mimeType', '')
            
            if file_size != '0':
                total_size += int(file_size)
            
            print(f"[{idx}/{len(all_files)}] {file_name[:60]}")
            if file_size != '0':
                size_mb = int(file_size) / (1024 * 1024)
                print(f"        Size: {size_mb:.2f} MB")
            
            if download_file(service, file_id, file_name, output_dir, mime_type):
                downloaded_count += 1
            else:
                failed_count += 1
        
        total_size_gb = total_size / (1024 * 1024 * 1024)
        
        print(f"\n{'='*70}")
        print(f"✅ Download Complete!")
        print(f"   📥 Downloaded: {downloaded_count} files")
        print(f"   ⏭️  Skipped: {skipped_count} files")
        print(f"   ❌ Failed: {failed_count} files")
        print(f"   📊 Total size: {total_size_gb:.2f} GB")
        print(f"   📁 Location: {output_dir}")
        print(f"{'='*70}\n")
        
        return {
            'total': len(all_files),
            'downloaded': downloaded_count,
            'skipped': skipped_count,
            'failed': failed_count,
            'total_size_gb': total_size_gb,
            'output_dir': output_dir
        }
        
    except HttpError as e:
        print(f"❌ HTTP Error accessing Google Drive: {e}")
        return {'error': str(e)}
    except Exception as e:
        print(f"❌ Error: {e}")
        return {'error': str(e)}


def main():
    # Determine script directory
    script_dir = Path(__file__).parent.absolute()
    
    # Default config location
    default_config = script_dir / '.config' / 'google_drive_config.json'
    
    # Check for config file
    config_file = None
    if os.path.exists(default_config):
        config_file = str(default_config)
    elif len(sys.argv) > 1 and sys.argv[1] == '--config':
        if len(sys.argv) > 2:
            config_file = sys.argv[2]
        else:
            print("❌ --config requires a file path")
            sys.exit(1)
    else:
        print("❌ No config file found")
        print(f"   Expected: {default_config}")
        print("\n💡 Options:")
        print("   1. Create config file at .config/google_drive_config.json")
        print("   2. Use: python google-drive-download-simple.py --folder-id YOUR_ID")
        sys.exit(1)
    
    print("="*70)
    print("📂 Google Drive Downloader (Configured)")
    print("="*70)
    print()
    
    # Load config
    config = load_config(config_file)
    
    # Get folder ID
    folder_id = config.get('folder_id')
    if not folder_id and config.get('folder_url'):
        try:
            folder_id = config['folder_url'].split('/folders/')[-1].split('?')[0]
        except:
            pass
    
    if not folder_id:
        print("❌ No folder_id in config file")
        sys.exit(1)
    
    # Get output directory
    output_dir = config.get('output_directory', './data/raw_google_drive_documents')
    
    # Expand user path if needed
    if output_dir.startswith('~'):
        output_dir = os.path.expanduser(output_dir)
    
    # Make absolute path
    if not os.path.isabs(output_dir):
        output_dir = str(script_dir / output_dir)
    
    print(f"📂 Folder ID: {folder_id}")
    print(f"📁 Output directory: {output_dir}")
    print()
    
    # Authenticate
    token_file = config.get('token_file', str(script_dir / 'token.json'))
    if not os.path.isabs(token_file):
        token_file = str(script_dir / token_file)
    
    print("🔐 Authenticating with Google Drive...")
    service = authenticate_google_drive(token_file)
    
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

