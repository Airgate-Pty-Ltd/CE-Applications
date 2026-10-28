#!/usr/bin/env python3
"""
Google Drive Authentication

Using credentials.json from Google Cloud Console
One-time setup to authorize access to Google Drive folders.
"""

import os
import sys
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
import json

# Google Drive API scopes
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']


def setup_google_authentication():
    """Set up Google Drive API authentication"""
    
    # Use Windows OneDrive path
    script_dir = Path(r"C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\backend\src\scripts")
    
    # Credentials file (downloaded from Google Cloud Console)
    secret_file = script_dir / 'credentials.json'
    
    # Token file (saved after authentication - JSON format for compatibility)
    token_file = script_dir / 'token.json'
    
    print("\n" + "="*70)
    print("🔐 Google Drive Authentication")
    print("="*70)
    
    # Check if already authenticated
    if os.path.exists(token_file):
        print("\n✅ Already authenticated!")
        print(f"   Token saved: {token_file}")
        print("   Ready to download files.\n")
        return True
    
    # Check if credentials.json exists
    if not os.path.exists(secret_file):
        print(f"\n❌ credentials.json not found!")
        print(f"   Expected: {secret_file}")
        print("\n📌 You need to:")
        print("   1. Go to Google Cloud Console")
        print("   2. Download OAuth 2.0 credentials")
        print("   3. Save as 'credentials.json' in the scripts folder")
        print(f"   4. Location: {script_dir}")
        return False
    
    print(f"\n✅ Found credentials.json: {secret_file}")
    print(f"\n📋 Authenticating with Google Drive...")
    print("   (Browser will open - sign in and click ALLOW)\n")
    
    try:
        flow = InstalledAppFlow.from_client_secrets_file(
            str(secret_file),
            SCOPES
        )
        
        creds = flow.run_local_server(port=0)
        
        # Save credentials as JSON (compatible with download scripts)
        with open(token_file, 'w') as f:
            f.write(creds.to_json())
        
        print("\n" + "="*70)
        print("✅ Authentication successful!")
        print(f"✅ Token saved to: {token_file}")
        print("="*70)
        print("\n💡 You can now use:")
        print("   python google-drive-download-simple.py --folder-id YOUR_FOLDER_ID")
        print("   python google-drive-download-configured.py")
        print()
        
        return True
        
    except Exception as e:
        print(f"\n❌ Authentication failed: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure credentials.json is valid JSON")
        print("2. Check that Google Drive API is enabled")
        print("3. Verify you clicked 'Allow' in the browser")
        print("4. Check internet connection")
        return False


if __name__ == "__main__":
    try:
        setup_google_authentication()
    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
