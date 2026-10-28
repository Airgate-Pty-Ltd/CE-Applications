#!/usr/bin/env node
/**
 * Bulk Import Script for EDCAT
 * 
 * Imports standards and documents in bulk from a directory structure or manifest file.
 * 
 * Usage:
 *   node scripts/bulkImport.js --type=standards --source=/path/to/files
 *   node scripts/bulkImport.js --type=documents --source=/path/to/files --customer-id=<uuid>
 *   node scripts/bulkImport.js --manifest=/path/to/manifest.json
 * 
 * Manifest JSON format:
 * {
 *   "standards": [
 *     {
 *       "name": "AS9100D",
 *       "code": "AS9100D",
 *       "version": "Rev D",
 *       "source_type": "standard",
 *       "description": "Quality Management Systems - Requirements for Aviation, Space and Defense Organizations",
 *       "file_path": "/path/to/as9100d.pdf"
 *     }
 *   ],
 *   "documents": [
 *     {
 *       "customer_id": "<uuid>",
 *       "document_name": "Quality Manual",
 *       "file_path": "/path/to/qm.pdf",
 *       "doc_type": "qm"
 *     }
 *   ]
 * }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import RegulatoryIngestService from '../services/regulatoryIngest.js';
import ingestionService from '../services/ingestionService.js';
import embeddingService from '../services/embeddingService.js';
import DocumentParser from '../services/parser.js';
import { Document, ParsedContent, RegulatorySource, RegulatorySourceDocument } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (key) => {
  const arg = args.find(a => a.startsWith(`--${key}=`));
  return arg ? arg.split('=')[1] : null;
};

const type = getArg('type'); // 'standards' or 'documents'
const source = getArg('source'); // directory path
const manifest = getArg('manifest'); // manifest JSON file
const customerId = getArg('customer-id'); // for documents
const dryRun = args.includes('--dry-run');

console.log('🚀 EDCAT Bulk Import Tool');
console.log('==========================\n');

if (dryRun) {
  console.log('⚠️  DRY RUN MODE - No changes will be made\n');
}

/**
 * Import a single standard with its document
 */
async function importStandard(standardData, filePath) {
  try {
    // Check if standard already exists
    const existing = await query(
      `SELECT id FROM regulatory_sources WHERE name = $1 AND source_type = 'standard'`,
      [standardData.name]
    );

    let standardId;
    if (existing.rows.length > 0) {
      standardId = existing.rows[0].id;
      console.log(`  ✓ Standard "${standardData.name}" already exists, using existing ID`);
    } else {
      // Create standard entry
      const standard = await RegulatorySource.create({
        name: standardData.name,
        region: standardData.region || null,
        source_type: 'standard',
        description: standardData.description || null,
        version_label: standardData.version || standardData.version_label || null,
        revision_date: standardData.revision_date || null
      });
      standardId = standard.id;
      console.log(`  ✓ Created standard: ${standardData.name} (${standardId})`);
    }

    // Upload document if file path provided
    if (filePath && fs.existsSync(filePath)) {
      const fileName = path.basename(filePath);
      const uploadDir = path.join(process.cwd(), 'edcat-backend', 'uploads', 'standards');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const destPath = path.join(uploadDir, `${Date.now()}-${fileName.replace(/\s+/g, '_')}`);
      fs.copyFileSync(filePath, destPath);

      const stats = fs.statSync(filePath);
      const document = await RegulatorySourceDocument.create({
        regulatory_source_id: standardId,
        document_name: fileName,
        file_path: destPath,
        file_size: stats.size,
        uploaded_by: 'bulk-import'
      });

      console.log(`    ✓ Uploaded document: ${fileName} (${(stats.size / 1024).toFixed(1)} KB)`);
      return { standardId, documentId: document.id };
    }

    return { standardId };
  } catch (error) {
    console.error(`  ✗ Error importing standard "${standardData.name}":`, error.message);
    throw error;
  }
}

/**
 * Import a single document
 */
async function importDocument(docData, filePath) {
  try {
    if (!docData.customer_id && !customerId) {
      throw new Error('customer_id is required for document imports');
    }

    const tenantId = docData.customer_id || customerId;
    const fileName = path.basename(filePath);
    const uploadDir = path.join(process.cwd(), 'edcat-backend', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const destPath = path.join(uploadDir, `${Date.now()}-${fileName.replace(/\s+/g, '_')}`);
    fs.copyFileSync(filePath, destPath);

    const stats = fs.statSync(filePath);
    const document = await Document.create({
      customer_id: tenantId,
      assessment_id: docData.assessment_id || null,
      document_name: docData.document_name || fileName,
      document_type: path.extname(fileName).slice(1) || null,
      file_path: destPath,
      file_size: stats.size,
      uploaded_by: docData.uploaded_by || 'bulk-import'
    });

    // Parse document
    const parsed = await DocumentParser.parse(destPath, document.document_type);
    const text = parsed.text || '';
    await ParsedContent.insert(document.id, DocumentParser.chunkText(text));
    await Document.updateParseStatus(document.id, 'complete', text, null);

    // Ingest for GAP analysis
    try {
      const mimeType = `application/${document.document_type || 'octet-stream'}`;
      const ingestionResult = await ingestionService.ingestDocument({
        documentId: document.id,
        tenantId,
        filePath: destPath,
        mimeType,
        docType: docData.doc_type || 'procedure',
        metadata: {
          assessment_id: docData.assessment_id || null,
          uploaded_by: docData.uploaded_by || 'bulk-import'
        }
      });

      // Queue embedding generation
      if (ingestionResult.chunkIds && ingestionResult.chunkIds.length > 0) {
        embeddingService.generateForChunks(ingestionResult.chunkIds).catch(err => {
          console.error(`    ⚠ Warning: Error generating embeddings:`, err.message);
        });
      }
    } catch (ingestionError) {
      console.warn(`    ⚠ GAP ingestion warning:`, ingestionError.message);
    }

    console.log(`  ✓ Imported document: ${docData.document_name || fileName} (${(stats.size / 1024).toFixed(1)} KB)`);
    return document;
  } catch (error) {
    console.error(`  ✗ Error importing document "${docData.document_name || filePath}":`, error.message);
    throw error;
  }
}

/**
 * Import from manifest file
 */
async function importFromManifest(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const results = { standards: [], documents: [], errors: [] };

  console.log(`📋 Processing manifest: ${manifestPath}\n`);

  // Import standards
  if (manifest.standards && manifest.standards.length > 0) {
    console.log(`📚 Importing ${manifest.standards.length} standard(s)...\n`);
    for (const standard of manifest.standards) {
      try {
        if (dryRun) {
          console.log(`  [DRY RUN] Would import: ${standard.name}`);
          results.standards.push({ name: standard.name, status: 'dry-run' });
        } else {
          const result = await importStandard(standard, standard.file_path);
          results.standards.push({ name: standard.name, ...result, status: 'success' });
        }
      } catch (error) {
        results.errors.push({ type: 'standard', name: standard.name, error: error.message });
      }
    }
  }

  // Import documents
  if (manifest.documents && manifest.documents.length > 0) {
    console.log(`\n📄 Importing ${manifest.documents.length} document(s)...\n`);
    for (const doc of manifest.documents) {
      try {
        if (dryRun) {
          console.log(`  [DRY RUN] Would import: ${doc.document_name || doc.file_path}`);
          results.documents.push({ name: doc.document_name, status: 'dry-run' });
        } else {
          const result = await importDocument(doc, doc.file_path);
          results.documents.push({ name: result.document_name, id: result.id, status: 'success' });
        }
      } catch (error) {
        results.errors.push({ type: 'document', name: doc.document_name || doc.file_path, error: error.message });
      }
    }
  }

  return results;
}

/**
 * Import from directory structure
 */
async function importFromDirectory(type, sourceDir) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory does not exist: ${sourceDir}`);
  }

  const results = { standards: [], documents: [], errors: [] };
  const files = fs.readdirSync(sourceDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx'].includes(ext);
  });

  console.log(`📁 Found ${files.length} file(s) in ${sourceDir}\n`);

  if (type === 'standards') {
    console.log(`📚 Importing as standards...\n`);
    for (const file of files) {
      const filePath = path.join(sourceDir, file);
      const name = path.basename(file, path.extname(file));
      
      try {
        if (dryRun) {
          console.log(`  [DRY RUN] Would import: ${name}`);
          results.standards.push({ name, status: 'dry-run' });
        } else {
          const standardData = {
            name,
            code: name,
            source_type: 'standard',
            description: `Imported standard: ${name}`
          };
          const result = await importStandard(standardData, filePath);
          results.standards.push({ name, ...result, status: 'success' });
        }
      } catch (error) {
        results.errors.push({ type: 'standard', name, error: error.message });
      }
    }
  } else if (type === 'documents') {
    if (!customerId) {
      throw new Error('--customer-id is required for document imports');
    }
    
    console.log(`📄 Importing as documents for customer: ${customerId}...\n`);
    for (const file of files) {
      const filePath = path.join(sourceDir, file);
      const name = path.basename(file, path.extname(file));
      
      try {
        if (dryRun) {
          console.log(`  [DRY RUN] Would import: ${name}`);
          results.documents.push({ name, status: 'dry-run' });
        } else {
          const docData = {
            customer_id: customerId,
            document_name: name,
            doc_type: 'procedure'
          };
          const result = await importDocument(docData, filePath);
          results.documents.push({ name: result.document_name, id: result.id, status: 'success' });
        }
      } catch (error) {
        results.errors.push({ type: 'document', name, error: error.message });
      }
    }
  }

  return results;
}

/**
 * Main execution
 */
async function main() {
  try {
    let results;

    if (manifest) {
      results = await importFromManifest(manifest);
    } else if (type && source) {
      results = await importFromDirectory(type, source);
    } else {
      console.error('❌ Error: Either --manifest or --type + --source must be provided');
      console.error('\nUsage:');
      console.error('  node scripts/bulkImport.js --manifest=/path/to/manifest.json');
      console.error('  node scripts/bulkImport.js --type=standards --source=/path/to/files');
      console.error('  node scripts/bulkImport.js --type=documents --source=/path/to/files --customer-id=<uuid>');
      process.exit(1);
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Import Summary');
    console.log('='.repeat(50));
    console.log(`✓ Standards: ${results.standards.filter(r => r.status === 'success').length}/${results.standards.length}`);
    console.log(`✓ Documents: ${results.documents.filter(r => r.status === 'success').length}/${results.documents.length}`);
    
    if (results.errors.length > 0) {
      console.log(`\n✗ Errors: ${results.errors.length}`);
      results.errors.forEach(err => {
        console.log(`  - ${err.type}: ${err.name} - ${err.error}`);
      });
    }

    if (dryRun) {
      console.log('\n⚠️  This was a dry run. Use without --dry-run to perform actual imports.');
    }

    process.exit(results.errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

