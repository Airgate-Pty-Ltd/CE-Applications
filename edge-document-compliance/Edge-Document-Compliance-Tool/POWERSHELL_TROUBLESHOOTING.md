# PowerShell Terminal Connection Troubleshooting

## Known Issues

The assistant's PowerShell terminal connection has been unreliable, causing:
- Commands to freeze/hang
- No output returned
- Timeouts

## Workarounds

### 1. Run Commands Manually

Always have a backup plan - run commands directly in your own PowerShell terminal.

### 2. Use Git GUI Tools

Instead of command line:
- **GitHub Desktop** - Visual Git interface
- **VS Code Git** - Built-in source control
- **GitKraken** - Professional Git client
- **SourceTree** - Free Git GUI

### 3. Use Git Bash

If PowerShell is problematic, use Git Bash (comes with Git for Windows):

```bash
# Navigate to project
cd /c/Users/oleab/OneDrive/Conform-Edge/EDCAT-Administrator

# Run git commands
git status
git add .
git commit -m "Your message"
git push origin main
```

### 4. Check for Blocking Processes

PowerShell might be waiting for:
- File locks (OneDrive syncing)
- Node processes still running
- Git processes stuck

**Check processes:**
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*node*"}
Get-Process | Where-Object {$_.ProcessName -like "*git*"}
```

**Kill stuck processes:**
```powershell
Stop-Process -Name "node" -Force
Stop-Process -Name "git" -Force
```

### 5. PowerShell Execution Policy

If scripts won't run:

```powershell
# Check current policy
Get-ExecutionPolicy

# Set to RemoteSigned (allows local scripts)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 6. OneDrive Sync Issues

OneDrive can cause file locking:
- Pause OneDrive sync temporarily
- Or exclude the project folder from OneDrive
- Or wait for sync to complete before running commands

### 7. Use Separate Terminal Windows

Instead of using the assistant's terminal:
1. Open your own PowerShell/terminal
2. Navigate to project directory
3. Run commands manually
4. Copy/paste commands from the assistant's suggestions

### 8. Break Commands into Smaller Steps

Instead of:
```powershell
git add . && git commit -m "message" && git push
```

Do:
```powershell
git add .
# Wait for completion
git commit -m "message"
# Wait for completion
git push
```

## Best Practices

1. **Always verify** - Check `git status` before committing
2. **Test locally first** - Make sure changes work before pushing
3. **Use descriptive commits** - Clear commit messages help track changes
4. **Push frequently** - Don't let changes accumulate
5. **Keep backups** - Regular commits are your backup

## When to Use Manual Commands

Use manual commands when:
- Assistant's terminal freezes
- Commands timeout
- Need immediate control
- Testing changes before committing
- Troubleshooting issues

## Quick Reference

**Check status:**
```powershell
git status
```

**Add files:**
```powershell
git add .
# or specific files
git add path/to/file.js
```

**Commit:**
```powershell
git commit -m "Descriptive message"
```

**Push:**
```powershell
git push origin main
```

**Pull latest:**
```powershell
git pull origin main
```

**See changes:**
```powershell
git diff
```

