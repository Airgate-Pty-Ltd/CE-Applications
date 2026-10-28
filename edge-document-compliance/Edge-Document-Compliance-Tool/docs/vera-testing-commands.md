# Vera Testing Commands

## PowerShell Commands for Testing Vera

### Test Validation Endpoint

```powershell
# Using Invoke-RestMethod (recommended)
Invoke-RestMethod -Uri "http://localhost:8080/api/vera/validate" -Method GET

# Or with full output
$response = Invoke-RestMethod -Uri "http://localhost:8080/api/vera/validate" -Method GET
$response | ConvertTo-Json -Depth 10
```

### Test Diagnostics Endpoint

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/vera/diagnostics" -Method GET | ConvertTo-Json -Depth 10
```

### Test Standards Endpoint

```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/vera/standards" -Method GET | ConvertTo-Json -Depth 5
```

### Test Conversation History

```powershell
# Replace {conversationId} with actual ID
Invoke-RestMethod -Uri "http://localhost:8080/api/vera/conversation/{conversationId}" -Method GET
```

### Test Feedback Endpoint

```powershell
$body = @{
    conversationId = "your-conversation-id"
    questionType = "compliance_question"
    wasHelpful = $true
    rating = 5
    feedbackText = "Great response!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/vera/feedback" -Method POST -Body $body -ContentType "application/json"
```

### Test Chat Endpoint

```powershell
$body = @{
    message = "What does clause 8.7 require?"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/chat" -Method POST -Body $body -ContentType "application/json"
```

## Railway Production URLs

If deployed on Railway, replace `localhost:8080` with your Railway URL:
```powershell
$railwayUrl = "https://your-app.railway.app"
Invoke-RestMethod -Uri "$railwayUrl/api/vera/validate" -Method GET
```

## Alternative: Using curl.exe

```powershell
# Windows has curl.exe available
curl.exe http://localhost:8080/api/vera/validate

# Or with JSON formatting (requires jq or manual parsing)
curl.exe http://localhost:8080/api/vera/validate | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

## Running Validation Script Directly

```powershell
# Run the validation script directly (requires database connection)
node backend/src/scripts/vera-final-validation.js

# Or run diagnostics
node backend/src/scripts/vera-diagnostics.js
```

