#!/usr/bin/env python3
"""
Download ALL files from Google Drive folders recursively
"""

import os
import json
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2.credentials import Credentials

token_file = r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\backend\src\scripts\token.json"
output_dir = r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\data\google_drive_downloads"
root_folder_id = "1Wk7rZxxq7z8HyWgjyxsaqIZsfYdw5AEY"

os.makedirs(output_dir, exist_ok=True)

print("\n" + "="*70)
print("📥 DOWNLOADING ALL GOOGLE DRIVE FILES (RECURSIVE)")
print("="*70 + "\n")

with open(token_file, 'r') as f:
    token_data = json.load(f)

creds = Credentials.from_authorized_user_info(token_data)
drive = build('drive', 'v3', credentials=creds)

downloaded = 0
failed = 0
folders_processed = 0

def download_folder(folder_id, path=""):
    global downloaded, failed, folders_processed
    
    try:
        query = f"'{folder_id}' in parents and trashed=false"
        results = drive.files().list(
            q=query,
            pageSize=1000,
            fields="files(id, name, mimeType, size)"
        ).execute()
        
        items = results.get('files', [])
        
        for item in items:
            item_id = item['id']
            item_name = item['name']
            mime_type = item['mimeType']
            full_path = os.path.join(path, item_name) if path else item_name
            
            if mime_type == 'application/vnd.google-apps.folder':
                # It's a folder - recurse
                folders_processed += 1
                print(f"\n📁 [{folders_processed}] Entering: {full_path}")
                download_folder(item_id, full_path)
            
            else:
                # It's a file - download it
                display_name = full_path[:70]
                print(f"   📄 Downloading: {display_name:<70}", end="", flush=True)
                
                try:
                    request = drive.files().get_media(fileId=item_id)
                    local_path = os.path.join(output_dir, full_path)
                    os.makedirs(os.path.dirname(local_path), exist_ok=True)
                    
                    with open(local_path, 'wb') as f:
                        downloader = MediaIoBaseDownload(f, request)
                        done = False
                        while not done:
                            _, done = downloader.next_chunk()
                    
                    print(" ✅")
                    downloaded += 1
                
                except Exception as e:
                    print(f" ❌ ({str(e)[:30]})")
                    failed += 1
    
    except Exception as e:
        print(f"Error processing folder: {e}")

print("Starting recursive download...\n")
download_folder(root_folder_id)

print(f"\n{'='*70}")
print(f"✅ DOWNLOAD COMPLETE!")
print(f"{'='*70}\n")

print(f"📊 Results:")
print(f"   ✅ Downloaded: {downloaded} files")
print(f"   ❌ Failed: {failed} files")
print(f"   📂 Folders processed: {folders_processed}\n")

print(f"📁 Location: {output_dir}\n")