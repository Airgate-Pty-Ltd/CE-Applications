// Git push script that writes results to a file I can read
const { execSync } = require('child_process');
const fs = require('fs');

const logFile = 'git-push-log.txt';

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
  console.log(msg); // Also try console
}

// Clear log
fs.writeFileSync(logFile, `=== Git Push Started ${new Date().toISOString()} ===\n`);

try {
  log('Checking status...');
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  log(`Status result: ${status.trim() || 'no changes'}`);
  
  if (status.trim()) {
    log('Staging changes...');
    execSync('git add -A', { encoding: 'utf8', stdio: 'inherit' });
    log('✓ Staged');
    
    log('Committing...');
    const msg = process.argv[2] || 'Auto-commit from script';
    execSync(`git commit -m "${msg}"`, { encoding: 'utf8', stdio: 'inherit' });
    log('✓ Committed');
  }
  
  log('Pushing...');
  const pushOutput = execSync('git push origin main', { 
    encoding: 'utf8',
    stdio: 'inherit'
  });
  log('✓ Push command completed');
  
  log('Verifying...');
  execSync('git fetch origin main', { encoding: 'utf8', stdio: 'ignore' });
  const local = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const remote = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
  
  log(`Local:  ${local.substring(0, 7)}`);
  log(`Remote: ${remote.substring(0, 7)}`);
  
  if (local === remote) {
    log('✅ SUCCESS: Pushed and verified!');
    fs.appendFileSync(logFile, 'RESULT: SUCCESS\n');
  } else {
    log('⚠️ Push may still be propagating');
    fs.appendFileSync(logFile, 'RESULT: IN_PROGRESS\n');
  }
  
} catch (error) {
  log(`❌ ERROR: ${error.message}`);
  fs.appendFileSync(logFile, `RESULT: FAILED - ${error.message}\n`);
  process.exit(1);
}

fs.appendFileSync(logFile, '=== Done ===\n');

