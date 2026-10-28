#!/usr/bin/env python3
import os
import json
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2.credentials import Credentials

token_file = r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\backend\src\scripts\token.json"
output_dir = r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\data\raw_google_drive_documents"
folder_id = "1Wk7rZxxq7z8HyWgjyxsaqIZsfYdw5AEY"

print("\n📂 Google Drive Downloader (Recursive)")
print("="*70)

if not os.path.exists(token_file):
    print("❌ Not authenticated yet!")
    exit(1)

print("🔐 Loading credentials...", end="", flush=True)

with open(token_file, 'r') as f:
    token_data = json.load(f)

creds = Credentials.from_authorized_user_info(token_data)
drive = build('drive', 'v3', credentials=creds)
print(" ✅")

os.makedirs(output_dir, exist_ok=True)

downloaded = 0
failed = 0
folders_checked = 0

def download_from_folder(folder_id, path=""):
    global downloaded, failed, folders_checked
    
    query = f"'{folder_id}' in parents and trashed=false"
    results = drive.files().list(q=query, pageSize=1000, fields="files(id, name, mimeType)").execute()
    items = results.get('files', [])
    
    for item in items:
        item_id = item['id']
        item_name = item['name']
        mime_type = item['mimeType']
        full_path = os.path.join(path, item_name)
        
        if mime_type == 'application/vnd.google-apps.folder':
            # It's a folder - recurse into it
            folders_checked += 1
            print(f"📁 Entering folder: {full_path}")
            download_from_folder(item_id, full_path)
        else:
            # It's a file - download it
            display_name = full_path[:60]
            print(f"   [{downloaded+failed+1}] {display_name:<60}", end="", flush=True)
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
                print(f" ❌")
                failed += 1

print("\n📥 Recursively downloading from all folders...\n")

download_from_folder(folder_id)

print(f"\n{'='*70}")
print(f"\n✅ Downloaded {downloaded} files")
if failed > 0:
    print(f"❌ Failed: {failed} files")
print(f"📂 Folders checked: {folders_checked}")
print(f"📁 Location: {output_dir}\n")