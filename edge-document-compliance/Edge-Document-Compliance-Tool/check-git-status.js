#!/usr/bin/env node
/**
 * Git Status Diagnostic Script
 * Checks git status, local vs remote, and push state
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function run(command, silent = false) {
  try {
    const result = execSync(command, {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output: result.trim() };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      output: error.stdout?.toString().trim() || error.stderr?.toString().trim() || ''
    };
  }
}

console.log('🔍 Git Status Diagnostic');
console.log('='.repeat(60));

const results = [];

// Check working directory status
console.log('\n1️⃣  Checking working directory...');
const status = run('git status --porcelain', true);
if (status.output) {
  console.log('❌ UNCOMMITTED CHANGES FOUND:');
  console.log(status.output);
  results.push('UNCOMMITTED_CHANGES');
} else {
  console.log('✅ Working directory is clean (no uncommitted changes)');
  results.push('CLEAN_WORKING_DIR');
}

// Get current branch
console.log('\n2️⃣  Checking current branch...');
const branch = run('git rev-parse --abbrev-ref HEAD', true);
if (branch.success) {
  console.log(`✅ Current branch: ${branch.output}`);
  results.push(`BRANCH: ${branch.output}`);
}

// Fetch latest from remote
console.log('\n3️⃣  Fetching latest from remote...');
const fetch = run('git fetch origin main', true);
if (fetch.success) {
  console.log('✅ Fetched latest from remote');
} else {
  console.log('⚠️  Fetch had issues (may be OK):', fetch.error);
}

// Get local commit hash
console.log('\n4️⃣  Checking local commit...');
const localHash = run('git rev-parse HEAD', true);
if (localHash.success) {
  console.log(`   Local commit: ${localHash.output.substring(0, 7)} (${localHash.output.substring(0, 40)}...)`);
  results.push(`LOCAL: ${localHash.output.substring(0, 7)}`);
}

// Get remote commit hash
console.log('\n5️⃣  Checking remote commit...');
const remoteHash = run('git rev-parse origin/main', true);
if (remoteHash.success) {
  console.log(`   Remote commit: ${remoteHash.output.substring(0, 7)} (${remoteHash.output.substring(0, 40)}...)`);
  results.push(`REMOTE: ${remoteHash.output.substring(0, 7)}`);
  
  // Compare
  if (localHash.success) {
    if (localHash.output === remoteHash.output) {
      console.log('\n✅ Local and remote are IN SYNC');
      results.push('IN_SYNC');
    } else {
      console.log('\n⚠️  Local and remote are DIFFERENT');
      
      // Check if local is ahead
      const ahead = run(`git rev-list --count origin/main..HEAD`, true);
      if (ahead.success && parseInt(ahead.output) > 0) {
        console.log(`   ⬆️  Local is ${ahead.output} commit(s) AHEAD of remote`);
        console.log('   → NEED TO PUSH!');
        results.push('NEEDS_PUSH');
      }
      
      // Check if remote is ahead
      const behind = run(`git rev-list --count HEAD..origin/main`, true);
      if (behind.success && parseInt(behind.output) > 0) {
        console.log(`   ⬇️  Local is ${behind.output} commit(s) BEHIND remote`);
        console.log('   → NEED TO PULL!');
        results.push('NEEDS_PULL');
      }
    }
  }
} else {
  console.log('❌ Could not get remote commit:', remoteHash.error);
  results.push('REMOTE_ERROR');
}

// Get recent commits
console.log('\n6️⃣  Recent local commits:');
const localCommits = run('git log --oneline -5', true);
if (localCommits.success) {
  console.log(localCommits.output);
}

// Get commits that need to be pushed
console.log('\n7️⃣  Commits not yet pushed to remote:');
const unpushed = run('git log origin/main..HEAD --oneline', true);
if (unpushed.success && unpushed.output) {
  console.log(unpushed.output);
  console.log('\n⚠️  THESE COMMITS NEED TO BE PUSHED!');
  results.push('HAS_UNPUSHED');
} else if (unpushed.success && !unpushed.output) {
  console.log('✅ All commits are pushed');
  results.push('ALL_PUSHED');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));

if (results.includes('NEEDS_PUSH') || results.includes('HAS_UNPUSHED')) {
  console.log('\n❌ ACTION NEEDED: You have commits that need to be pushed!');
  console.log('\nRun this command to push:');
  console.log('   git push origin main');
  console.log('\nOr use:');
  console.log('   npm run git:push "Your commit message"');
} else if (results.includes('UNCOMMITTED_CHANGES')) {
  console.log('\n❌ ACTION NEEDED: You have uncommitted changes!');
  console.log('\nRun these commands:');
  console.log('   git add -A');
  console.log('   git commit -m "Your message"');
  console.log('   git push origin main');
} else if (results.includes('IN_SYNC') && results.includes('ALL_PUSHED')) {
  console.log('\n✅ Everything is synced!');
  console.log('\nIf Railway isn\'t deploying, check:');
  console.log('   1. Railway is watching the correct branch (main)');
  console.log('   2. Railway build settings are correct');
  console.log('   3. Railway service is active');
} else {
  console.log('\n✅ Status: Everything appears to be in sync');
}

// Write results to file for reference
writeFileSync('git-status-results.txt', JSON.stringify(results, null, 2));
console.log('\n📄 Full results saved to: git-status-results.txt');

