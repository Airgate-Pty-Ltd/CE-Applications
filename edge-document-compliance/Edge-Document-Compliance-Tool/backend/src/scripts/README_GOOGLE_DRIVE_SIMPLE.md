# Google Drive Downloader

Quick setup guide for downloading documents from Google Drive.

## Two Ways to Use

### Option 1: Simple Setup (Recommended for First Time)

Use the setup script for guided authentication, then use the configured downloader:

```bash
# Step 1: Run setup (one-time)
python setup-google-auth.py

# Step 2: Create config file with your folder ID
# Edit .config/google_drive_config.json

# Step 3: Download files
python google-drive-download-configured.py
```

### Option 2: Direct Download (No Config File)

Use the simple downloader with command-line arguments:

```bash
python google-drive-download-simple.py --folder-id YOUR_FOLDER_ID
```

---

## Quick Setup (5 minutes)

### Step 1: Get Google Drive API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable **Google Drive API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google Drive API"
   - Click **Enable**
4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Choose **Desktop app** as application type
   - Click **Create**
   - Click **Download JSON**
   - Save as `credentials.json` in `backend/src/scripts/`

### Step 2: Create Config File

```bash
# Create config directory
mkdir -p backend/src/scripts/.config

# Create config file (replace YOUR_FOLDER_ID with actual ID)
cat > backend/src/scripts/.config/google_drive_config.json << 'EOF'
{
  "folder_url": "https://drive.google.com/drive/folders/YOUR_FOLDER_ID",
  "folder_id": "YOUR_FOLDER_ID",
  "output_directory": "./data/raw_google_drive_documents",
  "credentials_file": "credentials.json",
  "token_file": "token.json"
}
EOF
```

**To get your folder ID:**
1. Open Google Drive in browser
2. Navigate to your folder
3. Copy the folder ID from URL:
   ```
   https://drive.google.com/drive/folders/FOLDER_ID_HERE
   ```

### Step 3: Authenticate (One-Time Setup)

**Option A: Use Setup Script (Recommended)**

```bash
cd backend/src/scripts
python setup-google-auth.py
```

This will:
1. Guide you through downloading credentials.json
2. Open browser for authentication
3. Save token for future use

**Option B: Automatic (First Run)**

If you skip setup, the downloader will prompt you on first run.

### Step 4: Download Files

**Using Configured Downloader (with config file):**

```bash
# Create config file first (see Step 2)
python google-drive-download-configured.py
```

**Using Simple Downloader (command-line):**

```bash
# Direct folder ID
python google-drive-download-simple.py --folder-id YOUR_FOLDER_ID

# Or folder URL
python google-drive-download-simple.py --folder-url "https://drive.google.com/drive/folders/YOUR_FOLDER_ID"

# Or using config file
python google-drive-download-simple.py --config .config/google_drive_config.json
```

## Usage Examples

### Basic Download

```bash
python google-drive-download-simple.py --folder-id 1Wk7rZxxq7z8HyWgjyxsaqIZsfYdw5AEY
```

### Custom Output Directory

```bash
python google-drive-download-simple.py \
  --folder-id YOUR_FOLDER_ID \
  --output-dir ./my_documents
```

### Using Config File

```bash
python google-drive-download-simple.py --config .config/google_drive_config.json
```

## What Gets Downloaded

- **PDF files** → Direct download
- **Google Docs** → Exported as PDF
- **Google Sheets** → Exported as CSV
- **Word documents** → Direct download
- **Excel files** → Direct download
- **CSV files** → Direct download

## Output

Files are saved to: `./data/raw_google_drive_documents/`

Each file keeps its original name (cleaned for filesystem compatibility).

## Troubleshooting

### "Credentials file not found"

**Solution:** Download `credentials.json` from Google Cloud Console and place in `backend/src/scripts/`

### "Authentication failed"

**Solution:**
1. Delete `token.json` and try again
2. Make sure you granted all permissions
3. Check that Google Drive API is enabled

### "Permission denied" errors

**Solution:**
1. Make sure folder is shared with your Google account
2. Or make folder public (not recommended for sensitive data)

### "Invalid folder ID"

**Solution:**
- Verify folder ID from URL
- Make sure folder exists and is accessible
- Check folder sharing settings

## Next Steps

After downloading:

1. **Parse documents:**
   ```bash
   python parse-documents.py --input-dir ./data/raw_google_drive_documents
   ```

2. **Generate training data:**
   ```bash
   python create-training-data.py --input ./data/parsed/parsed_documents.json
   ```

3. **Fine-tune model:**
   ```bash
   python finetune-mistral.py --data ./data/training/training_data.jsonl
   ```

## Security Notes

- **Never commit** `credentials.json` or `token.json` to git
- They're already in `.gitignore`
- Tokens can be revoked from Google Account settings
- Script only requests read-only access

## File Structure

```
backend/src/scripts/
├── setup-google-auth.py              # One-time authentication setup
├── google-drive-download-simple.py  # Simple downloader (CLI args)
├── google-drive-download-configured.py # Configured downloader (uses config)
├── credentials.json                  # OAuth credentials (not in git)
├── token.json                        # Saved token (not in git)
└── .config/
    └── google_drive_config.json     # Config file (optional)
```

## Script Comparison

| Feature | `setup-google-auth.py` | `google-drive-download-simple.py` | `google-drive-download-configured.py` |
|---------|------------------------|-----------------------------------|--------------------------------------|
| **Purpose** | One-time auth setup | Direct download (no config) | Download using config file |
| **Config File** | Not needed | Optional | Required |
| **Best For** | First-time setup | Quick downloads | Repeated downloads |
| **Arguments** | None | `--folder-id`, `--folder-url`, `--config` | Uses config file |

## Example Workflow

```bash
# 1. First time: Set up authentication
python setup-google-auth.py

# 2. Create config file with your folder ID
cat > .config/google_drive_config.json << 'EOF'
{
  "folder_id": "1Wk7rZxxq7z8HyWgjyxsaqIZsfYdw5AEY",
  "output_directory": "./data/raw_google_drive_documents"
}
EOF

# 3. Download all files
python google-drive-download-configured.py

# Expected output:
# 📊 Found 2,847 files in folder
# [1/2847] AS9100D_Rev_F.pdf ✅
# [2/2847] Quality_Manual_2024.docx ✅
# ...
# ✅ Downloaded: 2,847 files
```

