// Simple verification and push script
const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== Git Push Verification ===\n');

// Check status
console.log('1. Checking git status...');
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim()) {
    console.log('   Found changes:', status.trim().split('\n').length, 'files');
  } else {
    console.log('   No uncommitted changes');
  }
} catch (e) {
  console.log('   Error:', e.message);
}

// Check if we're ahead of remote
console.log('\n2. Checking commits...');
try {
  execSync('git fetch origin main', { encoding: 'utf8', stdio: 'ignore' });
  const local = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const remote = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
  console.log('   Local: ', local.substring(0, 7));
  console.log('   Remote:', remote.substring(0, 7));
  
  if (local === remote) {
    console.log('   ✓ Already in sync - nothing to push');
  } else {
    const ahead = execSync(`git rev-list ${remote}..${local} --count`, { encoding: 'utf8' }).trim();
    console.log('   ⚠ Local is', ahead, 'commits ahead of remote');
    console.log('\n3. Pushing...');
    const pushOutput = execSync('git push origin main', { encoding: 'utf8', stdio: 'pipe' });
    console.log(pushOutput);
    console.log('   ✓ Push completed');
  }
} catch (e) {
  console.log('   Error:', e.message);
  if (e.message.includes('ahead')) {
    console.log('\n   Attempting push...');
    try {
      execSync('git push origin main', { encoding: 'utf8', stdio: 'inherit' });
      console.log('   ✓ Push completed');
    } catch (pushError) {
      console.log('   ✗ Push failed:', pushError.message);
      process.exit(1);
    }
  }
}

console.log('\n=== Done ===');

