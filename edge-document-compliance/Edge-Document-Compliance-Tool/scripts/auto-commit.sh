#!/bin/bash
# Auto-commit and push script
# Usage: ./scripts/auto-commit.sh "Your commit message"

if [ -z "$1" ]; then
    echo "Usage: $0 \"Your commit message\""
    exit 1
fi

echo "📝 Staging all changes..."
git add .

echo "💾 Committing changes..."
git commit -m "$1"

# The post-commit hook will automatically push
echo "✅ Changes committed and pushed to GitHub!"
echo "🚂 Railway will automatically deploy from GitHub..."

