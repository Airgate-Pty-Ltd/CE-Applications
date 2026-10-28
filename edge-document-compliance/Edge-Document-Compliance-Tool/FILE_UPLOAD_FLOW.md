# File Upload Flow - EDCAT Administrator

## Overview

When you upload a file through the EDCAT Administrator Compliance Library, here's exactly what happens:

---

## 📤 Upload Process

### 1. **File Upload** (Frontend → Backend)
- **Location**: `POST /api/upload`
- **Handler**: `backend/src/routes/upload.js`
- **Temporary Storage**: File is first saved to `uploads/documents/` folder by Multer

### 2. **File Storage Strategy**

The system uses **two different storage strategies** based on environment:

#### **Production (Railway) - Database Storage**
- **File Content**: Stored as **base64-encoded text** in database
- **Table**: `public.standard_files_content` (Customer Data DB)
- **Location**: `backend/config/storage.js` → `storeFile()`
- **Why**: Railway has ephemeral filesystem (files disappear on restart)

#### **Development (Local) - Filesystem Storage**
- **File Content**: Stored on **local filesystem**
- **Location**: `uploads/documents/` folder
- **Path**: `backend/uploads/documents/[filename]`

---

## 💾 Database Storage Details

### Step 1: Create/Get Standard Record
- **Database**: EDCAT AI DB
- **Table**: `standards`
- **Function**: `createOrGetStandard()` in `upload.js`
- **What's Saved**:
  - `id` (UUID)
  - `code` (e.g., "ISO9001:2015")
  - `name` (e.g., "ISO 9001:2015 Quality Management System")
  - `sector` (e.g., "Aerospace", "Medical Devices")
  - `uploaded_at` (timestamp)

### Step 2: Store File Content
- **Production**: 
  - **Database**: Customer Data DB
  - **Table**: `public.standard_files_content`
  - **Columns**:
    - `standard_id` (UUID - links to standards table)
    - `file_content` (TEXT - base64-encoded file)
    - `file_size` (INT - bytes)
    - `filename` (VARCHAR - original filename)
    - `stored_at` (TIMESTAMP)

- **Development**:
  - **Location**: `backend/uploads/documents/[filename]`
  - File is saved to local filesystem

### Step 3: Save File Metadata
- **Database**: Customer Data DB
- **Table**: `public.standard_files`
- **Function**: `saveFileMetadata()` in `upload.js`
- **What's Saved**:
  - `id` (UUID)
  - `file_name` (original filename)
  - `file_path` (path or 'database' flag)
  - `file_size` (bytes)
  - `file_type` (e.g., "pdf", "docx")
  - `file_category` ('standard', 'regulatory', 'customer_requirements')
  - `standard_id` (UUID - links to standards table)
  - `uploaded_at` (timestamp)

### Step 4: Update Standards Table (if standards file)
- **Database**: EDCAT AI DB
- **Table**: `standards`
- **What's Updated**:
  - `file_path` (set to 'database' or actual path)
  - `updated_at` (timestamp)

---

## 🔄 Complete Flow Diagram

```
User uploads file via UI
    ↓
POST /api/upload
    ↓
Multer saves to: uploads/documents/[temp_filename]
    ↓
┌─────────────────────────────────────┐
│ 1. Create/Get Standard (EDCAT AI)  │
│    Table: standards                 │
│    Returns: standardId               │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. Store File Content               │
│                                     │
│ Production (Railway):               │
│   → Customer Data DB                │
│   → Table: standard_files_content   │
│   → Format: base64-encoded          │
│                                     │
│ Development (Local):                │
│   → Filesystem: uploads/documents/  │
│   → Returns: file path              │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 3. Save File Metadata               │
│    → Customer Data DB                │
│    → Table: standard_files           │
│    → Links: standard_id             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 4. Update Standards (if standards)  │
│    → EDCAT AI DB                     │
│    → Table: standards                │
│    → Sets: file_path                 │
└─────────────────────────────────────┘
    ↓
✅ File is now in Compliance Library
```

---

## 📍 Where Files Are Stored

### Production (Railway)
- **File Content**: `public.standard_files_content` table (Customer Data DB)
- **File Metadata**: `public.standard_files` table (Customer Data DB)
- **Standard Info**: `standards` table (EDCAT AI DB)

### Development (Local)
- **File Content**: `backend/uploads/documents/[filename]` (filesystem)
- **File Metadata**: `public.standard_files` table (Customer Data DB)
- **Standard Info**: `standards` table (EDCAT AI DB)

---

## 🔍 How to Verify File Was Saved

### Check File Metadata
```sql
-- Customer Data DB
SELECT file_name, file_path, file_category, standard_id, uploaded_at
FROM public.standard_files
WHERE file_name = 'your-file.pdf';
```

### Check File Content (Production)
```sql
-- Customer Data DB
SELECT filename, file_size, stored_at
FROM public.standard_files_content
WHERE standard_id = 'your-standard-id';
```

### Check Standard Record
```sql
-- EDCAT AI DB
SELECT code, name, file_path, uploaded_at
FROM standards
WHERE code = 'your-standard-code';
```

---

## ⚠️ Important Notes

1. **Two Databases**: File metadata and content are in Customer Data DB, but standard records are in EDCAT AI DB
2. **Production Storage**: In Railway, files are stored as base64 in database (not filesystem)
3. **File Linking**: Files are linked to standards via `standard_id` UUID
4. **Category Mapping**: 
   - `standards` → `file_category = 'standard'`
   - `regulatory` → `file_category = 'regulatory'`
   - `customer` → `file_category = 'customer_requirements'`

---

## 🛠️ Troubleshooting

### File Not Appearing in Library
1. Check `standard_files` table has entry
2. Check `standards` table has entry with matching `standard_id`
3. Check `uploaded_at` is set (required for filtering)
4. Check `file_category` matches the category filter

### File Not Retrievable for Parsing
1. Check `standard_files_content` table (production) or filesystem (dev)
2. Verify `standard_id` matches between tables
3. Check file path in `standard_files.file_path` or `standards.file_path`

