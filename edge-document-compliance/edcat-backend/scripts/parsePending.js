import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../database/connection.js';
import { Document, ParsedContent } from '../models/index.js';
import DocumentParser from '../services/parser.js';
import RequirementExtractor from '../services/nlp.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function parsePending() {
  try {
    const pending = await Document.getPending(20);
    if (!pending.length) {
      console.log('No pending documents to parse.');
      process.exit(0);
      return;
    }

    const extractor = new RequirementExtractor();

    for (const doc of pending) {
      try {
        console.log(`Parsing document ${doc.document_name} (${doc.id})`);
        const parsed = await DocumentParser.parse(doc.file_path, doc.document_type);
        const text = parsed.text || '';
        await ParsedContent.insert(doc.id, DocumentParser.chunkText(text));
        await Document.updateParseStatus(doc.id, 'complete', text, null);

        const extracted = extractor.extract(text);
        console.log(`Extracted ${extracted.length} candidate requirements.`);
      } catch (error) {
        console.error(`Failed to parse ${doc.document_name}:`, error.message);
        await Document.updateParseStatus(doc.id, 'error', null, error.message);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Parse pending failed:', error.message);
    process.exit(1);
  }
}

parsePending();
