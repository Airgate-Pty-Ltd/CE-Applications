/**
 * Quick commit script for greeting system
 */

import { execSync } from 'child_process';

const commitMessage = `Add: Enhanced Vera greeting system with natural responses

- Added comprehensive greeting persona with time-of-day, empathy, and humor variants
- Created greeting behavior rules for context-aware greeting selection
- Implemented VeraGreetingEngine for intelligent greeting generation
- Integrated greeting engine into conversation middleware
- Updated chat route to handle short greetings vs greetings with tasks
- Added support for personalized, reconnect, and emotional tone greetings
- Greetings now respond naturally to "how are you" and detect user stress/rush
- Short greetings (< 40 chars) return immediately, longer ones go through normal flow`;

console.log('🚀 Committing and pushing greeting system changes...\n');

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

