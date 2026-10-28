#!/usr/bin/env node
/**
 * Simple Node.js script to push to GitHub
 * Writes clear output that can be read back
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const resultFile = path.join(__dirname, 'push-result.txt');

function writeResult(msg) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(resultFile, `[${timestamp}] ${msg}\n`);
  console.log(msg);
}

function runCommand(cmd, description) {
  try {
    writeResult(`Executing: ${description}`);
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    writeResult(`✓ ${description} succeeded`);
    if (output) {
      writeResult(`Output: ${output.trim()}`);
    }
    return { success: true, output };
  } catch (error) {
    writeResult(`✗ ${description} failed`);
    writeResult(`Error: ${error.message}`);
    if (error.stdout) writeResult(`Stdout: ${error.stdout}`);
    if (error.stderr) writeResult(`Stderr: ${error.stderr}`);
    return { success: false, error: error.message };
  }
}

// Clear result file
fs.writeFileSync(resultFile, `=== GIT PUSH STARTED ===\n`);

writeResult('Starting git push process...');

// Step 1: Stage changes
const stageResult = runCommand('git add -A', 'Staging changes');
if (!stageResult.success) {
  writeResult('RESULT: FAILED - Could not stage changes');
  process.exit(1);
}

// Step 2: Commit
const commitMsg = process.argv[2] || 'Auto-commit: Changes from AI assistant';
const commitResult = runCommand(`git commit -m "${commitMsg}"`, 'Committing changes');
// Don't fail if commit says "nothing to commit"
if (!commitResult.success && !commitResult.error.includes('nothing to commit')) {
  writeResult('RESULT: FAILED - Could not commit');
  process.exit(1);
}

// Step 3: Push
const pushResult = runCommand('git push origin main', 'Pushing to GitHub');
if (!pushResult.success) {
  writeResult('RESULT: FAILED - Could not push to GitHub');
  writeResult(`Exit code: ${pushResult.error}`);
  process.exit(1);
}

// Step 4: Verify
writeResult('Verifying push...');
try {
  execSync('git fetch origin main', { encoding: 'utf8', stdio: 'pipe' });
  const localHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const remoteHash = execSync('git rev-parse origin/main', { encoding: 'utf8' }).trim();
  
  writeResult(`Local hash:  ${localHash}`);
  writeResult(`Remote hash: ${remoteHash}`);
  
  if (localHash === remoteHash) {
    writeResult('✓ Verification: Local and remote are in sync');
  } else {
    writeResult('⚠ Hashes differ (may need time to propagate)');
  }
} catch (error) {
  writeResult(`⚠ Verification failed: ${error.message}`);
}

writeResult('RESULT: SUCCESS');
writeResult('=== GIT PUSH COMPLETE ===');

