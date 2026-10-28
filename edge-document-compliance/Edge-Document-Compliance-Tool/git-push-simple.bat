@echo off
REM Simple batch script for git push - writes clear output

echo === Git Push Started === > git-push-result.txt
echo Timestamp: %date% %time% >> git-push-result.txt

echo.
echo Adding files...
git add -A
if errorlevel 1 (
    echo ERROR: git add failed >> git-push-result.txt
    exit /b 1
)

echo Committing...
git commit -m "Auto-commit: %*"
if errorlevel 1 (
    echo WARNING: Commit may have failed or no changes >> git-push-result.txt
)

echo Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo ERROR: Push failed >> git-push-result.txt
    echo RESULT: FAILED >> git-push-result.txt
    exit /b 1
) else (
    echo SUCCESS: Push completed >> git-push-result.txt
    echo RESULT: SUCCESS >> git-push-result.txt
)

echo === Done === >> git-push-result.txt

