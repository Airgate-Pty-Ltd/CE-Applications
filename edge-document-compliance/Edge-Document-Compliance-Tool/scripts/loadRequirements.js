import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { query } from '../database/connection.js';
import { RegulatorySource, Requirement } from '../models/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadRequirements() {
  try {
    const dataDir = path.join(__dirname, '..', 'data', 'regulatory');
    const files = await fs.readdir(dataDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const content = await fs.readFile(path.join(dataDir, file), 'utf8');
      const sources = JSON.parse(content);

      for (const src of sources) {
        const existing = await RegulatorySource.getByName(src.source);
        const sourceRecord = existing || (await RegulatorySource.create({
          name: src.source,
          region: src.region || null,
          source_type: src.source_type || 'standard',
          description: src.description || null
        }));

        await Requirement.bulkInsert(sourceRecord.id, src.requirements || []);
      }
    }

    console.log('Requirement load complete');
    process.exit(0);
  } catch (error) {
    console.error('Requirement load failed:', error);
    process.exit(1);
  }
}

loadRequirements();
