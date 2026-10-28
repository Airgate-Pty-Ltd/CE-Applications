// Test script to see if Node.js can capture git output
const { execSync } = require('child_process');

try {
  console.log('=== Testing Git Commands ===');
  
  const status = execSync('git status --short', { encoding: 'utf8' });
  console.log('Status:', status || '(empty)');
  
  const log = execSync('git log --oneline -1', { encoding: 'utf8' });
  console.log('Last commit:', log.trim());
  
  const remote = execSync('git remote get-url origin', { encoding: 'utf8' });
  console.log('Remote:', remote.trim().substring(0, 50) + '...');
  
  console.log('\n✅ Git commands work from Node.js');
} catch (error) {
  console.error('❌ Error:', error.message);
}

