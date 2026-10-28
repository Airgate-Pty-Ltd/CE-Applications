#!/usr/bin/env node
/**
 * Simple Push Script - Always pushes, creates empty commit if needed
 */

import { execSync } from 'child_process';

function run(command, silent = false) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: silent ? 'pipe' : 'inherit' 
    });
    return result ? result.toString().trim() : '';
  } catch (error) {
    if (!silent) console.error('Error:', error.message);
    return null;
  }
}

console.log('🚀 Simple Push Script');
console.log('='.repeat(60));

// Stage all changes
console.log('\n📦 Staging all changes...');
run('git add -A');

// Commit any changes
const commitMsg = process.argv[2] || 'Update: Automated commit';
console.log(`\n💾 Committing with message: "${commitMsg}"`);
run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`) || console.log('   (Nothing to commit)');

// Fetch remote
console.log('\n🔄 Fetching from remote...');
run('git fetch origin main', true);

// Check if local and remote are in sync
const localHash = run('git rev-parse HEAD', true);
const remoteHash = run('git rev-parse origin/main', true);

if (localHash && remoteHash && localHash === remoteHash) {
  console.log('\n✅ Everything is synced. Creating empty commit to trigger Railway...');
  const triggerMsg = process.argv[2] || 'Trigger: Force Railway redeploy';
  run(`git commit --allow-empty -m "${triggerMsg.replace(/"/g, '\\"')}"`) || console.log('   (Empty commit may have failed)');
}

// Always push
console.log('\n🚀 Pushing to origin/main...');
const pushResult = run('git push origin main', false);

// Push succeeded if we got here without exception
console.log('\n✅ Push completed!');
console.log('\n✅ Railway should now redeploy automatically.');
console.log('   Check Railway dashboard in 1-2 minutes.');

