#!/usr/bin/env python3
import os
import json
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2.credentials import Credentials

token_file = r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\backend\src\scripts\token.json"
output_dir = r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\data\raw_google_drive_documents"
folder_id = "1Wk7rZxxq7z8HyWgjyxsaqIZsfYdw5AEY"

print("\n📂 Google Drive Downloader")
print("="*70)
print(f"\n📂 Folder ID: {folder_id}")
print(f"📁 Output: {output_dir}\n")

if not os.path.exists(token_file):
    print("❌ Not authenticated yet!")
    exit(1)

print("🔐 Loading credentials...", end="", flush=True)

with open(token_file, 'r') as f:
    token_data = json.load(f)

creds = Credentials.from_authorized_user_info(token_data)
drive = build('drive', 'v3', credentials=creds)
print(" ✅")

print("\n📥 Querying YOUR Google Drive folder...", end="", flush=True)

query = f"'{folder_id}' in parents and trashed=false"
results = drive.files().list(q=query, pageSize=1000, fields="files(id, name)").execute()
files = results.get('files', [])
print(f" ✅\n")

if not files:
    print("❌ No files found!\n")
    exit(1)

print(f"📊 Found {len(files)} files\n")
os.makedirs(output_dir, exist_ok=True)

print("📥 Downloading...\n")

downloaded = 0
for i, file in enumerate(files, 1):
    name = file['name'][:50]
    print(f"[{i}/{len(files)}] {name:<50}", end="", flush=True)
    try:
        request = drive.files().get_media(fileId=file['id'])
        path = os.path.join(output_dir, file['name'])
        with open(path, 'wb') as f:
            downloader = MediaIoBaseDownload(f, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
        print(" ✅")
        downloaded += 1
    except Exception as e:
        print(f" ❌")

print(f"\n✅ Downloaded {downloaded}/{len(files)} files")
print(f"📁 Location: {output_dir}\n")