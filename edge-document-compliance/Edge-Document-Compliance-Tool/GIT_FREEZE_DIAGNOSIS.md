# Git Command Freeze Diagnosis

## Problem
Git commands executed through Cursor AI tools freeze/interrupt, but work fine when run manually.

## Root Cause Analysis

### Findings

1. **Post-Commit Hooks Exist**
   - `.git/hooks/post-commit` (shell script)
   - `.git/hooks/post-commit.ps1` (PowerShell script)
   - These hooks automatically push after commit (per AUTO_DEPLOY_SETUP.md)

2. **OneDrive Path**
   - Repository is in: `C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator`
   - OneDrive sync may interfere with git operations

3. **PowerShell Execution**
   - Commands run in PowerShell (not Git Bash)
   - PowerShell may have different behavior than manual execution

4. **Tool Execution Context**
   - Cursor AI tools run in a controlled environment
   - May have different permissions, timeouts, or input handling
   - Commands show "Command was interrupted" - suggests timeout or blocking

## Likely Causes

### Primary Suspect: Post-Commit Hook
The `post-commit` hook automatically runs `git push` after every commit. This could:
- Hang waiting for credentials
- Timeout if network is slow
- Block if there are conflicts
- Interfere with the tool's command execution

### Secondary Suspects

1. **OneDrive File Locking**
   - OneDrive sync may lock files during git operations
   - Git needs exclusive access to `.git/index` and other files

2. **PowerShell Execution Policy**
   - May block script execution
   - Different behavior for interactive vs. programmatic execution

3. **Git Credential Manager**
   - May prompt for credentials interactively
   - Tool can't provide interactive input

4. **Command Timeout**
   - Tool may have a timeout for command execution
   - Git operations (especially with hooks) may exceed timeout

5. **Terminal Session Issues**
   - Tool creates new shell sessions
   - May not preserve environment variables or git config

## Solutions

### Solution 1: Disable Post-Commit Hook Temporarily (Quick Fix)
```powershell
# Rename the hook to disable it
Rename-Item .git\hooks\post-commit .git\hooks\post-commit.disabled
Rename-Item .git\hooks\post-commit.ps1 .git\hooks\post-commit.ps1.disabled

# After testing, re-enable:
Rename-Item .git\hooks\post-commit.disabled .git\hooks\post-commit
Rename-Item .git\hooks\post-commit.ps1.disabled .git\hooks\post-commit.ps1
```

### Solution 2: Use Git with No Hooks Flag
```powershell
# Skip hooks when committing
git commit --no-verify -m "message"
```

### Solution 3: Check Git Credential Configuration
```powershell
# Check if credential helper is configured
git config --global credential.helper

# If not set, configure it to avoid prompts
git config --global credential.helper manager-core
```

### Solution 4: Use Direct Git Commands (No Hooks)
Create a wrapper script that:
1. Commits with `--no-verify` (skip hooks)
2. Pushes manually
3. Avoids interactive prompts

### Solution 5: Check OneDrive Sync Status
```powershell
# Check if OneDrive is syncing
# Pause OneDrive sync temporarily during git operations
# Or exclude .git folder from OneDrive sync
```

## Recommended Approach

**For Cursor AI Tool Execution:**
1. Use `git commit --no-verify` to skip hooks
2. Use `git push` separately (not in hook)
3. Set `GIT_TERMINAL_PROMPT=0` to avoid interactive prompts
4. Use `--no-edit` flag if needed

**Modified Tool Approach:**
Instead of:
```bash
git add file
git commit -m "message"
git push
```

Use:
```bash
git add file
git commit --no-verify -m "message"
git push
```

Or set environment variable:
```bash
$env:GIT_TERMINAL_PROMPT=0
git add file
git commit -m "message"
git push
```

## Testing

To test if hooks are the issue:
1. Temporarily disable post-commit hooks
2. Try git commands through tool
3. If it works, hooks are the problem
4. Re-enable hooks and modify them to be non-blocking

## Long-term Fix

Modify the post-commit hook to:
- Run asynchronously (don't block commit)
- Handle errors gracefully
- Use non-interactive git commands
- Add timeout handling
- Log to file instead of stdout

