# Windows Quick Start Guide - Google Drive Download

## Your Directory Structure

```
C:\Users\oleab\quality-llm\
├── .credentials\
│   └── client_secret.json          # OAuth credentials (from Google Cloud Console)
├── scripts\
│   ├── setup-google-auth.py        # Authentication setup
│   └── google-drive-download-configured.py  # Download script
├── .config\
│   └── google_drive_config.json    # Config with your folder ID
└── data\
    └── raw_google_drive_documents\ # Downloaded files go here
```

## Step 1: Create Directory Structure

```powershell
# Create directories
New-Item -ItemType Directory -Force -Path "C:\Users\oleab\quality-llm\.credentials"
New-Item -ItemType Directory -Force -Path "C:\Users\oleab\quality-llm\scripts"
New-Item -ItemType Directory -Force -Path "C:\Users\oleab\quality-llm\.config"
New-Item -ItemType Directory -Force -Path "C:\Users\oleab\quality-llm\data\raw_google_drive_documents"
```

## Step 2: Save OAuth Credentials

1. **Download** `client_secret.json` from Google Cloud Console
2. **Save it to:** `C:\Users\oleab\quality-llm\.credentials\client_secret.json`

**Important:** 
- ✅ Keep this file on your PC only
- ❌ Do NOT upload to Google Drive
- ❌ Do NOT commit to git

## Step 3: Copy Scripts to Your Directory

Copy these files from the project to your `quality-llm` directory:

```powershell
# Copy scripts
Copy-Item "backend\src\scripts\setup-google-auth.py" -Destination "C:\Users\oleab\quality-llm\scripts\"
Copy-Item "backend\src\scripts\google-drive-download-configured.py" -Destination "C:\Users\oleab\quality-llm\scripts\"
```

## Step 4: Create Config File

Create `C:\Users\oleab\quality-llm\.config\google_drive_config.json`:

```json
{
  "folder_url": "https://drive.google.com/drive/folders/1Wk7rZxxq7z8HyWgjyxsaqIZsfYdw5AEY",
  "folder_id": "1Wk7rZxxq7z8HyWgjyxsaqIZsfYdw5AEY",
  "output_directory": "C:\\Users\\oleab\\quality-llm\\data\\raw_google_drive_documents",
  "credentials_file": "C:\\Users\\oleab\\quality-llm\\.credentials\\client_secret.json",
  "token_file": "C:\\Users\\oleab\\quality-llm\\.credentials\\token.json"
}
```

**Note:** Replace `1Wk7rZxxq7z8HyWgjyxsaqIZsfYdw5AEY` with your actual Google Drive folder ID.

## Step 5: Install Python Packages

```powershell
pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

## Step 6: Run Authentication Setup

```powershell
cd C:\Users\oleab\quality-llm\scripts
python setup-google-auth.py
```

**What happens:**
1. Script looks for `client_secret.json` in `.credentials\` folder
2. Browser opens asking you to sign in to Google
3. Click "Allow" to grant access
4. Token saved to `.credentials\token.json`

## Step 7: Download Files

```powershell
cd C:\Users\oleab\quality-llm\scripts
python google-drive-download-configured.py
```

**Expected output:**
```
📂 Google Drive Downloader (Configured)
======================================================================
📂 Folder ID: 1Wk7rZxxq7z8HyWgjyxsaqIZsfYdw5AEY
📁 Output directory: C:\Users\oleab\quality-llm\data\raw_google_drive_documents

🔐 Authenticating with Google Drive...
✅ Authentication successful!

📥 Downloading files from folder: 1Wk7rZxxq7z8HyWgjyxsaqIZsfYdw5AEY

🔍 Searching for files...
📊 Found 2,847 files in folder

[1/2847] AS9100D_Rev_F.pdf ✅
[2/2847] Quality_Manual_2024.docx ✅
...

✅ Download Complete!
   📥 Downloaded: 2,847 files
   📁 Location: C:\Users\oleab\quality-llm\data\raw_google_drive_documents
```

## Alternative: Use Scripts from Project Directory

If you prefer to use the scripts directly from the project without copying:

```powershell
# Navigate to project scripts
cd C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\backend\src\scripts

# Create config pointing to your quality-llm directory
# Edit .config/google_drive_config.json to use your paths

# Run setup
python setup-google-auth.py

# Run download
python google-drive-download-configured.py
```

## Troubleshooting

### "Credentials file not found"

**Solution:** Make sure `client_secret.json` is saved to:
```
C:\Users\oleab\quality-llm\.credentials\client_secret.json
```

### "Module not found"

**Solution:** Install packages:
```powershell
pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### "Access denied" or "Permission denied"

**Solution:**
1. Make sure the Google Drive folder is shared with your Google account
2. Check that you clicked "Allow" during authentication
3. Delete `token.json` and run setup again

### "Invalid folder ID"

**Solution:**
- Verify folder ID from Google Drive URL
- Make sure folder exists and is accessible
- Check folder sharing settings

## What Gets Downloaded

- ✅ **PDF files** → Direct download
- ✅ **Google Docs** → Exported as PDF
- ✅ **Google Sheets** → Exported as CSV
- ✅ **Word documents** → Direct download
- ✅ **Excel files** → Direct download

## Security Notes

- 🔒 `client_secret.json` stays on your PC only
- 🔒 `token.json` stays on your PC only
- 🔒 Never upload credentials to Google Drive
- 🔒 Never commit credentials to git
- ✅ Scripts only request read-only access

## Next Steps

After downloading:

1. **Parse documents:**
   ```powershell
   python parse-documents.py --input-dir C:\Users\oleab\quality-llm\data\raw_google_drive_documents
   ```

2. **Generate training data:**
   ```powershell
   python create-training-data.py --input C:\Users\oleab\quality-llm\data\parsed\parsed_documents.json
   ```

3. **Fine-tune model:**
   ```powershell
   python finetune-mistral.py --data C:\Users\oleab\quality-llm\data\training\training_data.jsonl
   ```

