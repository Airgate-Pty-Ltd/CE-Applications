# Google Drive Document Extraction for Vera

This script extracts documents from Google Drive folders and prepares them for Vera ingestion.

## Prerequisites

1. **Install Python packages:**
   ```bash
   pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client
   ```

2. **Get Google Drive API Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable **Google Drive API**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Choose **Desktop app** as application type
   - Download the credentials JSON file
   - Save it as `credentials.json` in the `backend/src/scripts/` directory

3. **Get Google Drive Folder ID:**
   - Open Google Drive in browser
   - Navigate to your folder
   - Copy the folder ID from the URL:
     ```
     https://drive.google.com/drive/folders/FOLDER_ID_HERE
     ```

## Usage

### Basic Usage

```bash
cd backend/src/scripts
python extract-google-drive-documents.py --folder-id YOUR_FOLDER_ID
```

### With Custom Output Directory

```bash
python extract-google-drive-documents.py \
  --folder-id YOUR_FOLDER_ID \
  --output-dir ./data/raw_documents
```

### With Custom Credentials File

```bash
python extract-google-drive-documents.py \
  --folder-id YOUR_FOLDER_ID \
  --credentials ./my-credentials.json
```

## First Run

On first run, the script will:
1. Open a browser window for OAuth authentication
2. Ask you to sign in to Google
3. Grant permissions to access Google Drive
4. Save a `token.json` file for future use

Subsequent runs will use the saved token (no browser login needed).

## Supported File Types

- **PDF files** (`.pdf`) - Direct download
- **Google Docs** - Exported as PDF
- **Google Sheets** - Exported as CSV
- **Word documents** (`.docx`) - Direct download
- **Excel spreadsheets** (`.xlsx`) - Direct download
- **CSV files** (`.csv`) - Direct download

## Output

Extracted documents are saved to the specified output directory (default: `./data/raw_documents/`).

An extraction report is saved as `extraction_report.json` with:
- Total files found
- Files extracted
- Files skipped (unsupported types)
- Errors encountered

## Next Steps

After extraction:

1. **Review extracted documents:**
   ```bash
   ls -la ./data/raw_documents/
   ```

2. **Run Vera ingestion:**
   ```bash
   npm run ingest:requirements
   ```

3. **Documents will be available for Vera to query**

## Troubleshooting

### "Credentials file not found"
- Make sure `credentials.json` is in the same directory as the script
- Or use `--credentials` to specify the path

### "Authentication failed"
- Delete `token.json` and try again
- Make sure you granted all required permissions
- Check that Google Drive API is enabled in your project

### "Permission denied" errors
- Make sure the folder is shared with the Google account you authenticated with
- Or make the folder public (not recommended for sensitive data)

### "Unsupported file type"
- The script only supports common document formats
- Other file types (images, videos, etc.) will be skipped
- You can extend the script to support additional types

## Security Notes

- **Never commit `credentials.json` or `token.json` to git**
- Add them to `.gitignore`:
  ```
  credentials.json
  token.json
  ```
- The script only requests read-only access to Google Drive
- Tokens are stored locally and can be revoked from Google Account settings

## Integration with Vera

After extraction, documents can be ingested into Vera using:

```bash
# Comprehensive ingestion (processes all document types)
npm run ingest:requirements

# Or use the specific ingestion script
node backend/src/scripts/ingest-requirements-comprehensive.js
```

Vera will then be able to:
- Answer questions about the documents
- Perform gap analysis
- Generate procedures based on examples
- Cross-reference with standards

