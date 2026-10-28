/**
 * Quick commit script - runs git:all with a predefined message
 */

import { execSync } from 'child_process';

const commitMessage = process.argv[2] || 'Fix: Vera greeting detection and blueprint table creation

- Fixed greeting detection to prioritize messages starting with greeting keywords
- Fixed greeting handler to only treat meaningful previous topics as returning users
- Added direct blueprint table creation script (bypasses SQL parsing issues)
- Added Vera diagnostic script to check database setup
- Improved error logging in conversation middleware
- Fixed placeholder replacement in greeting variants
- Added fallback handling for greetings in chat route
- Created Node.js git helper to bypass PowerShell freezing issues';

console.log('🚀 Committing and pushing all changes...\n');

try {
  execSync(`npm run git:all "${commitMessage}"`, {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('\n✅ Successfully committed and pushed!');
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}

