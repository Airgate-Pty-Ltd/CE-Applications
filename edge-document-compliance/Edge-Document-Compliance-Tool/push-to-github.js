#!/usr/bin/env node
/**
 * Simple Git Push Script
 * Pushes all changes to GitHub for Railway redeploy
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function run(command, options = {}) {
  try {
    const result = execSync(command, {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe'],
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || error.stderr };
  }
}

console.log('🚀 Git Push Script');
console.log('='.repeat(60));

// Check status
console.log('\n📊 Checking git status...');
const status = run('git status --porcelain');
if (status.output && status.output.trim()) {
  console.log('Found changes:');
  console.log(status.output);
  
  // Stage all changes
  console.log('\n📦 Staging all changes...');
  const add = run('git add -A');
  if (!add.success) {
    console.error('❌ Failed to stage changes:', add.error);
    process.exit(1);
  }
  console.log('✅ Changes staged');
  
  // Commit
  console.log('\n💾 Committing changes...');
  const commitMsg = process.argv[2] || 'Update: Automated commit via push script';
  const commit = run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
  if (!commit.success && !commit.error.includes('nothing to commit')) {
    console.error('❌ Failed to commit:', commit.error);
    process.exit(1);
  }
  if (commit.success) {
    console.log('✅ Changes committed');
  } else {
    console.log('ℹ️  Nothing to commit (already up to date)');
  }
} else {
  console.log('✅ Working directory clean');
}

// Get current commit hash
console.log('\n📝 Current commit:');
const localHashResult = run('git rev-parse HEAD', true);
let localHash = '';
if (localHashResult.success) {
  localHash = localHashResult.output.trim();
  console.log(`   Local: ${localHash.substring(0, 7)}`);
}

// Fetch remote
console.log('\n🔄 Fetching remote...');
run('git fetch origin main', true);

// Compare with remote
const remoteHashResult = run('git rev-parse origin/main', true);
let remoteHash = '';

if (remoteHashResult.success) {
  remoteHash = remoteHashResult.output.trim();
  console.log(`   Remote: ${remoteHash.substring(0, 7)}`);
  
  if (localHash && remoteHash && localHash === remoteHash) {
    console.log('\n✅ Local and remote are in sync');
    console.log('\n💡 Creating empty commit to trigger Railway redeploy...');
    const commitMsg = process.argv[2] || 'Trigger: Force Railway redeploy';
    const emptyCommit = run(`git commit --allow-empty -m "${commitMsg.replace(/"/g, '\\"')}"`, true);
    
    if (emptyCommit.success) {
      console.log('✅ Empty commit created');
      // Get new hash after commit
      const newLocalHashResult = run('git rev-parse HEAD', true);
      if (newLocalHashResult.success) {
        localHash = newLocalHashResult.output.trim();
        console.log(`   New commit: ${localHash.substring(0, 7)}`);
      }
    } else {
      console.log('⚠️  Empty commit may have failed, but continuing to push...');
    }
  } else if (localHash && remoteHash) {
    console.log('\n⚠️  Local and remote are different - will push changes');
  }
}

// Push
console.log('\n🚀 Pushing to origin/main...');
const push = run('git push origin main');
if (!push.success) {
  console.error('\n❌ Push failed!');
  console.error('Error:', push.error);
  console.error('Output:', push.output);
  process.exit(1);
}

console.log('\n✅ Push successful!');

// Verify
console.log('\n✅ Verifying push...');
run('git fetch origin main');
const verifyLocal = run('git rev-parse HEAD');
const verifyRemote = run('git rev-parse origin/main');

if (verifyLocal.success && verifyRemote.success) {
  const local = verifyLocal.output.trim();
  const remote = verifyRemote.output.trim();
  
  if (local === remote) {
    console.log('✅ SUCCESS: Push verified - local and remote match!');
    console.log(`   Commit: ${local.substring(0, 7)}`);
  } else {
    console.log('⚠️  Push completed but hashes differ');
    console.log(`   Local:  ${local.substring(0, 7)}`);
    console.log(`   Remote: ${remote.substring(0, 7)}`);
  }
}

console.log('\n✅ Done! Railway will automatically redeploy.');
