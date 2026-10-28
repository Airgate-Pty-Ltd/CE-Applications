# Run Process Requirements Script

## Problem
The script needs `EDCAT_AI_DATABASE_URL` environment variable to connect to the database.

## Solution
Created `run-process-requirements.ps1` script that sets the environment variable and runs the process script.

## How to Run

### Option 1: Use the PowerShell Script (Recommended)
```powershell
.\run-process-requirements.ps1
```

### Option 2: Set Environment Variable Manually
```powershell
$env:EDCAT_AI_DATABASE_URL = 'postgresql://postgres:cHtzllnYLfokPEWyetIpVrvQbHTrKLiM@tramway.proxy.rlwy.net:53952/railway'
node backend/src/scripts/process-requirements-folder.js
```

## What It Will Process
- ✅ 39 standards from `backend/EDCAT AIP/Requirements/Standards/`
- ✅ 2 regulations from `backend/EDCAT AIP/Requirements/Regulatory/`
- ✅ 1 customer requirement from `backend/EDCAT AIP/Requirements/Customer/`

## After Running
All files will be:
1. Stored in `standard_files` table with correct `file_category`
2. Standards created in EDCAT AI DB with `uploaded_at` set
3. Visible in the compliance library


