#!/usr/bin/env node
/**
 * Find files with syntax errors related to "analyze"
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Searching for syntax errors related to "analyze"...\n');

// Files to check
const filesToCheck = [
  'server/routes/analyze.routes.js',
  'server/services/ExcelAnalyzer.js',
  'backend/src/app.js',
  'backend/index.js',
  'backend/src/routes/gap.js',
];

for (const file of filesToCheck) {
  const fullPath = path.join(__dirname, file);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${file}`);
    continue;
  }
  
  console.log(`\n📄 Checking: ${file}`);
  
  try {
    // Try to parse it
    execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
    console.log(`   ✅ Syntax OK`);
    
    // Check for "analyze" patterns that might cause issues
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, idx) => {
      if (line.includes('analyze') && (
        line.includes('export analyze') ||
        line.includes('import analyze') ||
        line.includes('const analyze') ||
        line.includes('let analyze') ||
        line.includes('var analyze') ||
        line.match(/^\s*analyze\s*=/)
      )) {
        console.log(`   ⚠️  Line ${idx + 1}: ${line.trim()}`);
      }
    });
    
  } catch (error) {
    console.log(`   ❌ SYNTAX ERROR FOUND!`);
    console.log(`   Error: ${error.message.split('\n')[0]}`);
    
    // Show context
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    const errorLine = parseInt(error.message.match(/line (\d+)/)?.[1] || '1');
    
    console.log(`   \n   Context around line ${errorLine}:`);
    for (let i = Math.max(0, errorLine - 3); i < Math.min(lines.length, errorLine + 3); i++) {
      const marker = i === errorLine - 1 ? ' >>> ' : '     ';
      console.log(`${marker}${i + 1}: ${lines[i]}`);
    }
  }
}

console.log('\n✅ Check complete!');

