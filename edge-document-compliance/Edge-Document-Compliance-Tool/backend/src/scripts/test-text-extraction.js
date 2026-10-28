/**
 * Test Script: Extract Text from PDF and Display First 1500 Characters
 * 
 * Usage:
 *   node backend/src/scripts/test-text-extraction.js path/to/file.pdf
 * 
 * Or set the file path in the script below
 */

import TextExtractor from '../services/textExtractor.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testTextExtraction() {
  try {
    // Get file path from command line argument or use default
    const filePath = process.argv[2] || 'path/to/as9100.pdf';
    
    if (filePath === 'path/to/as9100.pdf') {
      console.log('⚠️  Please provide a file path as an argument:');
      console.log('   node backend/src/scripts/test-text-extraction.js path/to/your-file.pdf');
      console.log('\nOr update the filePath variable in the script.');
      return;
    }

    console.log(`📄 Extracting text from: ${filePath}`);
    console.log('─'.repeat(60));

    // Create extractor instance
    const extractor = new TextExtractor();

    // Extract text from file
    const text = await extractor.extractFromFile(filePath);

    console.log(`✅ Successfully extracted ${text.length} characters`);
    console.log('─'.repeat(60));
    console.log('\n📋 First 1500 characters:\n');
    console.log('─'.repeat(60));
    console.log(text.substring(0, 1500));
    console.log('─'.repeat(60));
    
    if (text.length > 1500) {
      console.log(`\n... (${text.length - 1500} more characters)`);
    }

    // Also show some statistics
    console.log('\n📊 Text Statistics:');
    console.log(`   Total characters: ${text.length}`);
    console.log(`   Total lines: ${text.split('\n').length}`);
    console.log(`   Total words: ${text.split(/\s+/).filter(w => w.length > 0).length}`);
    
    // Show first few lines
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    console.log(`\n📝 First 10 non-empty lines:`);
    lines.slice(0, 10).forEach((line, idx) => {
      console.log(`   ${idx + 1}. ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testTextExtraction();

