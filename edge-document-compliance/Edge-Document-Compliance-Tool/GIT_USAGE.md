# Git Helper - Bypass PowerShell Issues

Since PowerShell keeps freezing, use these Node.js-based git commands instead.

## Quick Commands

### Check Status
```bash
npm run git:status
```

### Stage All Changes
```bash
npm run git:add
```

### Commit Changes
```bash
npm run git:commit "Your commit message here"
```

### Push to Remote
```bash
npm run git:push
```

### Do Everything (Add + Commit + Push)
```bash
npm run git:all "Your commit message here"
```

## Examples

**Commit and push current changes:**
```bash
npm run git:all "Fix: Vera greeting detection and blueprint table creation"
```

**Just check what's changed:**
```bash
npm run git:status
```

**Stage specific files:**
```bash
npm run git:add backend/src/routes/chat.js backend/src/middleware/veraConversationMiddleware.js
```

## How It Works

The `git-helper.js` script uses Node.js's `execSync` to run git commands directly, bypassing PowerShell entirely. This should avoid the freezing issues.

## Troubleshooting

If you still have issues:
1. Make sure you're in the project root directory
2. Ensure git is installed and in your PATH
3. Check that you have write permissions to the repository

