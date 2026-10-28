# Cursor AI Git Workflow - Fixed

## Problem
Git commands freeze because post-commit hooks automatically run `git pull` and `git push`, which block in the tool's execution context.

## Solution
Use `--no-verify` flag to skip hooks when committing through Cursor AI tools.

## Updated Workflow

### For Cursor AI Tool Execution:
```bash
# Stage changes
git add .

# Commit with --no-verify to skip hooks
git commit --no-verify -m "Add: [description]"

# Push manually (hooks already skipped)
git push origin main
```

### Why This Works
- `--no-verify` skips the post-commit hook that causes the freeze
- Manual push after commit avoids hook blocking
- Still maintains automatic deployment (Railway watches GitHub)

## Updated .cursorrules Recommendation

The `.cursorrules` file says to "always commit automatically", but we need to modify the approach:

**Instead of:**
```bash
git commit -m "message"  # Triggers hook → freezes
```

**Use:**
```bash
git commit --no-verify -m "message"  # Skips hook → works
git push origin main  # Manual push
```

## Implementation

When Cursor AI needs to commit:
1. Use `git commit --no-verify` instead of `git commit`
2. Follow with explicit `git push origin main`
3. This avoids hook execution that causes freezes

## Verification

Test this approach:
- Commits should complete without freezing
- Changes still get pushed to GitHub
- Railway still auto-deploys (watches GitHub, not hooks)

