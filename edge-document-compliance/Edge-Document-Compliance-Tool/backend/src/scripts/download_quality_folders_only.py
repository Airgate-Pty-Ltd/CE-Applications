#!/usr/bin/env python3
"""
Download ONLY from 46 specific quality document folders
"""

import os
import json
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2.credentials import Credentials

token_file = r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\backend\src\scripts\token.json"
output_dir = r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\data\quality_docs_all"

# Your 46 quality folders
quality_folder_ids = [
    "1BUnYm9hwTugwR1iV5mtu4aCOsuu51nCX",
    "1xXUTdrHYcBxzbTbvVnOuSHRF95sNd1Xu",
    "1h87fMPK-qG160ijB-qru8kvT-AbhCbbh",
    "17eyeUXywa_n6ogsl1WOlMh1jDqqG3vhx",
    "17jGeKypRGVgzATlFuHBBxOFA88xp4Xdq",
    "11BvEzT52X-ZfQI-lL6JV66LRcZ7txM1b",
    "17x1bBBMDn-kRHjXKKfD3VlJBs8wmY8VR",
    "1oz9wkxgQMUkOUjYT9B1Jx9VTpxWSZb-0",
    "1higvOXV4om_bB6g1FYpwx80Jn2iLaxIz",
    "107Rg2vpejEW2BFpWDUg7aTqFyc5JZta4",
    "1tzCx9u8V_pBrLmiOi10-CY7oUKnLfxmJ",
    "1CB4BabNuXH9eaGhB3XGjJSdMLnJbZS9G",
    "1BbociYO-OaFJLxGD3vftLKiW3BiLWOId",
    "17E1v-b2OAFxvGGpzYpbdiI9VIdhD8GdN",
    "1INRcKaS5Ugx9Uo4QRxsZy07-s8NIRViV",
    "13Au4n7Te84K89LMRTWT9Tryc4oXcAaAy",
    "1kyAM7rO0sbdMCkQcfDWjNxtcgi9e0Gu3",
    "1h1YVlTNx8_SmPc7VWS8cwDBIaO0ae7aS",
    "19afCSM3rFIYx88KQaFXUfpL_74GVh3Pz",
    "1a8Tf9xSkoaycDLdn8td77BdsAJlsNM0A",
    "10sK1vjIe81FEqUL0NB0vXLeuxKrBusWP",
    "1yPIgeoNlHgzqK3wn8ejM0a-vAg0E5Dle",
    "1BDG4ibm434pqjK2_NN__SihzZxJOrhdE",
    "1pobiVMNNn984-UZGtPIh0_PXNwIE89Na",
    "1zGQGUd2T9DYypw4Ng7IUDL84dS7YTyLx",
    "1_H5lS4K577PPt8ScZXyIsYtq6TB2V0ei",
    "1aYpqO20HYgYhKH5NQoaO1jvOFww-Smjv",
    "1Tp3vOZL-I90py6IPyUwpmoEHfySWVbX1",
    "1NzsKRZgmgLFXJeQGagBdOq7hVL0XpHTa",
    "1E1ojdHYXs8Q1EOvfofiLkv39BKICTOaz",
    "1AUoDZgcvcfU9Yzo-6Qf2xJGGRdbTyoZj",
    "10Vvmaj-CjHGQZliJlKH5P_DcV3S8bjtu",
    "1yImHcf_5BnqCEwyQQx21tJjifHa3jv8M",
    "1KW8tc9A2Zkiat5yIdngfiEI_lsNzYiIq",
    "1Xbx4xAAoLNjpOqrxJEVS_GfzVq458vGj",
    "1yfbYP2Z1ao921jlxCYS6U92zus_zYBb3",
    "1MHcaFwVyQRi7sUKtUoUA4SCLjWAi9T6F",
    "1YxKUX50vcRim-61szEHnoKFK0pYvPwyC",
    "1Nk7urOGym5SKk75wDQUC01je3wNhAiEC",
    "1x0OP_0lQW3ijG0FL4mpX-AYbPxVKijDA",
    "1gAmgljIA9RJeJIfaXMsmtYZt-3vHsIfU",
    "1N-c5IJN-4Y-4YQb83cp7LURfTt-Fm39U",
    "1Jr2G_BinJxaoBrvxbtvuM2wsnpb3mQ7Y",
    "1p_qMvgiIlAQdsT8S8FjIId-3KL9GboDz",
    "1fcTs0Dvaxs_y7RMpL2xRHuO1Dl1W74ds",
    "1bjT2Fj9Cb4XwEcjgFckuv27rejTj-QAS",
]

os.makedirs(output_dir, exist_ok=True)

print("\n" + "="*70)
print("📥 DOWNLOADING 46 QUALITY DOCUMENT FOLDERS")
print("="*70 + "\n")

with open(token_file, 'r') as f:
    token_data = json.load(f)

creds = Credentials.from_authorized_user_info(token_data)
drive = build('drive', 'v3', credentials=creds)

downloaded = 0
failed = 0

def download_folder(folder_id, folder_name):
    global downloaded, failed
    
    try:
        query = f"'{folder_id}' in parents and trashed=false"
        results = drive.files().list(
            q=query,
            pageSize=1000,
            fields="files(id, name, mimeType)"
        ).execute()
        
        items = results.get('files', [])
        
        for item in items:
            if item['mimeType'] == 'application/vnd.google-apps.folder':
                # Recurse into subfolder
                download_folder(item['id'], f"{folder_name}/{item['name']}")
            else:
                # Download file
                print(f"   📄 {item['name'][:60]:<60}", end="", flush=True)
                try:
                    request = drive.files().get_media(fileId=item['id'])
                    path = os.path.join(output_dir, folder_name, item['name'])
                    os.makedirs(os.path.dirname(path), exist_ok=True)
                    
                    with open(path, 'wb') as f:
                        downloader = MediaIoBaseDownload(f, request)
                        done = False
                        while not done:
                            _, done = downloader.next_chunk()
                    
                    print(" ✅")
                    downloaded += 1
                except Exception as e:
                    print(f" ❌")
                    failed += 1
    
    except Exception as e:
        pass

# Download each quality folder
for i, folder_id in enumerate(quality_folder_ids, 1):
    print(f"\n📁 [{i}/46] Downloading folder...")
    download_folder(folder_id, f"quality_doc_{i}")

print(f"\n{'='*70}")
print(f"✅ Downloaded {downloaded} files")
print(f"❌ Failed: {failed}")
print(f"📁 Location: {output_dir}\n")