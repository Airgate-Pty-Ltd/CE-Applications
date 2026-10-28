@echo off
echo ========================================
echo Triggering Railway Redeploy
echo ========================================
echo.

echo Creating empty commit to trigger deployment...
git commit --allow-empty -m "Trigger: Force Railway redeploy - %date% %time%"

if %errorlevel% neq 0 (
    echo Warning: Commit may have failed, continuing anyway...
)

echo.
echo Pushing to GitHub...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS: Push completed!
    echo Railway should now redeploy automatically.
    echo ========================================
) else (
    echo.
    echo ========================================
    echo ERROR: Push failed!
    echo Check your git configuration and try again.
    echo ========================================
    exit /b 1
)

