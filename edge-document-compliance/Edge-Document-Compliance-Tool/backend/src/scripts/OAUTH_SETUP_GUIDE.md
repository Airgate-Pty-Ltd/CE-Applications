# Google OAuth Setup Guide - Step by Step

Complete guide for setting up Google Drive API access.

## Step 1: OAuth Consent Screen

### App Information

**App name:**
```
EDCAT Quality LLM Downloader
```
or
```
Quality Document Downloader
```

**User support email:**
- Enter **your email address** (the one you use for Google Cloud Console)
- This is where users can contact you if they have questions
- Example: `your-email@example.com`

**App logo:** (Optional - Skip for now)

Click **Save and Continue**

---

## Step 2: Scopes

**Click "Add or Remove Scopes"**

**Search for and select:**
- `.../auth/drive.readonly` (View and download all your Google Drive files)

**Click "Update"** then **"Save and Continue"**

---

## Step 3: Test Users (If App is in Testing Mode)

**Add your email address:**
- Click "Add Users"
- Enter your Google account email
- Click "Add"

**Click "Save and Continue"**

---

## Step 4: Summary

Review the information and click **"Back to Dashboard"**

---

## Step 5: Create OAuth 2.0 Credentials

1. Go to **"Credentials"** (left sidebar)
2. Click **"+ CREATE CREDENTIALS"**
3. Select **"OAuth client ID"**

### OAuth Client ID Settings

**Application type:**
- Select **"Desktop app"**

**Name:**
```
EDCAT Drive Downloader
```
or
```
Quality LLM Downloader
```

**Click "CREATE"**

---

## Step 6: Download Credentials

1. A popup will show your **Client ID** and **Client Secret**
2. Click **"DOWNLOAD JSON"**
3. Save the file as `credentials.json`
4. Move it to: `backend/src/scripts/credentials.json`

**Important:** The file will be named something like `client_secret_XXXXX.json` - rename it to `credentials.json`

---

## Step 7: Run Setup Script

```bash
cd backend/src/scripts
python setup-google-auth.py
```

This will:
1. Check for `credentials.json`
2. Open browser for authentication
3. Save `token.json` for future use

---

## Troubleshooting

### "App is in testing mode"

**Solution:**
- Add your email as a test user (Step 3)
- Or publish the app (not recommended for personal use)

### "Access blocked: This app's request is invalid"

**Solution:**
- Make sure you selected `drive.readonly` scope
- Check that OAuth consent screen is configured

### "Redirect URI mismatch"

**Solution:**
- Make sure you selected "Desktop app" as application type
- Don't manually add redirect URIs

### "Credentials file not found"

**Solution:**
- Make sure `credentials.json` is in `backend/src/scripts/`
- Check the filename (should be exactly `credentials.json`)

---

## Quick Checklist

- [ ] OAuth consent screen configured
- [ ] App name entered
- [ ] Support email entered
- [ ] `drive.readonly` scope added
- [ ] Test user added (if in testing mode)
- [ ] OAuth 2.0 Client ID created (Desktop app)
- [ ] `credentials.json` downloaded and renamed
- [ ] `credentials.json` placed in `backend/src/scripts/`
- [ ] `setup-google-auth.py` run successfully
- [ ] `token.json` created

---

## Security Notes

- **Never commit** `credentials.json` or `token.json` to git
- They're already in `.gitignore`
- Keep credentials secure
- Revoke access from Google Account settings if needed

