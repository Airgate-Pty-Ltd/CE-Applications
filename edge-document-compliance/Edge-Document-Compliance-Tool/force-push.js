#!/usr/bin/env node
/**
 * Force Push Script
 * Checks status and forces a push even if git says nothing to commit
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const output = [];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  output.push(line);
  console.log(line);
}

function run(command) {
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return { success: true, output: result.trim() };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || error.stderr };
  }
}

log('🚀 Force Push Diagnostic');
log('='.repeat(60));

// 1. Check for uncommitted changes
log('\n1. Checking for uncommitted changes...');
const status = run('git status --porcelain');
if (status.output) {
  log(`Found uncommitted changes:\n${status.output}`);
  log('Staging all changes...');
  run('git add -A');
  const commitMsg = process.argv[2] || 'Update: Force push commit';
  log(`Committing with message: "${commitMsg}"`);
  run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
} else {
  log('✅ No uncommitted changes');
}

// 2. Fetch remote
log('\n2. Fetching from remote...');
run('git fetch origin main');

// 3. Compare local vs remote
log('\n3. Comparing local vs remote...');
const localHash = run('git rev-parse HEAD');
const remoteHash = run('git rev-parse origin/main');

if (localHash.success) {
  log(`Local:  ${localHash.output.substring(0, 7)}`);
}
if (remoteHash.success) {
  log(`Remote: ${remoteHash.output.substring(0, 7)}`);
}

// 4. Check if there are commits to push
const unpushed = run('git log origin/main..HEAD --oneline');
if (unpushed.success && unpushed.output) {
  log(`\n⚠️  Found unpushed commits:\n${unpushed.output}`);
  
  // 5. Create an empty commit to force a push if needed
  log('\n4. Creating an empty commit to trigger deployment...');
  const emptyCommit = run('git commit --allow-empty -m "Trigger: Force deployment"');
  
  if (emptyCommit.success || emptyCommit.error.includes('nothing to commit')) {
    log('✅ Empty commit created (or already exists)');
  }
  
  // 6. Push
  log('\n5. Pushing to origin/main...');
  const push = run('git push origin main');
  
  if (push.success) {
    log('✅ Push successful!');
  } else {
    log(`❌ Push failed: ${push.error}`);
    log(`Output: ${push.output}`);
  }
} else {
  log('\n✅ No unpushed commits found');
  log('Creating empty commit to trigger Railway deployment...');
  
  const emptyCommit = run('git commit --allow-empty -m "Trigger: Force Railway redeploy"');
  if (emptyCommit.success) {
    log('✅ Empty commit created');
    log('Pushing...');
    const push = run('git push origin main');
    if (push.success) {
      log('✅ Push successful! Railway should redeploy now.');
    } else {
      log(`❌ Push failed: ${push.error}`);
    }
  } else {
    log('Could not create empty commit');
  }
}

// Verify
log('\n6. Verifying push...');
run('git fetch origin main');
const verifyLocal = run('git rev-parse HEAD');
const verifyRemote = run('git rev-parse origin/main');

if (verifyLocal.success && verifyRemote.success) {
  if (verifyLocal.output === verifyRemote.output) {
    log('✅ Verified: Local and remote match!');
  } else {
    log('⚠️  Local and remote still differ');
  }
}

// Save output
writeFileSync('force-push-output.txt', output.join('\n'));
log('\n📄 Full output saved to: force-push-output.txt');
log('\n✅ Done! Check Railway for deployment.');

