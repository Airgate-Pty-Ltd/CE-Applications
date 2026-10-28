/**
 * Scan Vera Requirements Folder
 * 
 * Standalone script to scan and index documents from Requirements folder
 * Run with: node backend/src/scripts/scan-vera-requirements-folder.js
 */

import { scanAndIndexRequirementsFolder, getRequirementsFolderSummary } from '../services/vera/VeraRequirementsFolderScanner.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('='.repeat(60));
  console.log('Vera Requirements Folder Scanner');
  console.log('='.repeat(60));
  console.log('');
  
  // Check for dry-run flag
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('');
  }
  
  // Scan and index
  const result = await scanAndIndexRequirementsFolder({ dryRun });
  
  if (result.success) {
    console.log('');
    console.log('='.repeat(60));
    console.log('Scan Summary:');
    console.log('='.repeat(60));
    console.log(`  Scanned: ${result.stats.scanned} documents`);
    console.log(`  Indexed: ${result.stats.indexed} documents`);
    console.log(`  Approved: ${result.stats.approved} documents`);
    console.log(`  Bad: ${result.stats.bad} documents`);
    console.log(`  Errors: ${result.stats.errors}`);
    console.log(`  Skipped: ${result.stats.skipped}`);
    console.log('');
    
    // Get summary
    const summary = await getRequirementsFolderSummary();
    if (summary.success && summary.summary.length > 0) {
      console.log('Indexed Documents by Standard and Quality:');
      console.log('-'.repeat(60));
      for (const row of summary.summary) {
        console.log(`  ${row.standard_code || 'Unknown'}: ${row.quality || 'unknown'} - ${row.count} documents`);
      }
    }
  } else {
    console.error('❌ Scan failed:', result.error);
    process.exit(1);
  }
  
  console.log('');
  console.log('✅ Complete!');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

