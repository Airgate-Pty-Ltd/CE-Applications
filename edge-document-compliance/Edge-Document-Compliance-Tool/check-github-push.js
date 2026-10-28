#!/usr/bin/env node
/**
 * Check if push actually reached GitHub
 */

import { execSync } from 'child_process';

console.log('🔍 Checking GitHub Push Status');
console.log('='.repeat(60));

try {
  console.log('\n1️⃣  Fetching latest from GitHub...');
  execSync('git fetch origin main', { stdio: 'inherit' });
  
  console.log('\n2️⃣  Local commits:');
  const localCommits = execSync('git log --oneline -5', { encoding: 'utf8' });
  console.log(localCommits);
  
  console.log('\n3️⃣  Remote commits (on GitHub):');
  const remoteCommits = execSync('git log origin/main --oneline -5', { encoding: 'utf8' });
  console.log(remoteCommits);
  
  console.log('\n4️⃣  Comparing...');
  const localHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const remoteHash = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
  
  console.log(`   Local:  ${localHash.substring(0, 7)}`);
  console.log(`   Remote: ${remoteHash.substring(0, 7)}`);
  
  if (localHash === remoteHash) {
    console.log('\n✅ Local and remote match - push was successful!');
    console.log('\n⚠️  If Railway isn\'t deploying:');
    console.log('   1. Check Railway service is Active (not paused)');
    console.log('   2. Check Railway is watching the "main" branch');
    console.log('   3. Try manual "Redeploy" button in Railway dashboard');
  } else {
    console.log('\n⚠️  Local and remote differ!');
    const unpushed = execSync('git log origin/main..HEAD --oneline', { encoding: 'utf8' });
    if (unpushed.trim()) {
      console.log('\n   Unpushed commits:');
      console.log(unpushed);
      console.log('\n   → Need to push these commits!');
    }
    
    const unpulled = execSync('git log HEAD..origin/main --oneline', { encoding: 'utf8' });
    if (unpulled.trim()) {
      console.log('\n   Unpulled commits:');
      console.log(unpulled);
      console.log('\n   → Need to pull first!');
    }
  }
  
  console.log('\n📋 GitHub Repository URL:');
  const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
  console.log(`   ${remoteUrl}`);
  console.log('\n   Check this URL in your browser to verify commits are there.');
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}

