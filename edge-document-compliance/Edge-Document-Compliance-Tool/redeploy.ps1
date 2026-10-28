# PowerShell script to force Railway redeploy
# Creates an empty commit and pushes to trigger Railway

Write-Host "🚀 Forcing Railway Redeploy" -ForegroundColor Cyan
Write-Host "=" * 60

Write-Host "`n📝 Creating empty commit..." -ForegroundColor Yellow
git commit --allow-empty -m "Trigger: Force Railway redeploy"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Empty commit created" -ForegroundColor Green
} else {
    Write-Host "⚠️  Commit may have failed, but continuing..." -ForegroundColor Yellow
}

Write-Host "`n🚀 Pushing to origin/main..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ SUCCESS: Push completed!" -ForegroundColor Green
    Write-Host "✅ Railway should now redeploy automatically." -ForegroundColor Green
    Write-Host "   Check Railway dashboard in 1-2 minutes." -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Push failed! Check your git configuration." -ForegroundColor Red
    exit 1
}

