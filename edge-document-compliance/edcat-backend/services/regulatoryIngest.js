import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import DocumentParser from './parser.js';
import RequirementExtractor from './nlp.js';
import { RegulatoryIngestion, RegulatoryIngestionRequirement } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INGEST_ROOT = path.join(__dirname, '..', 'uploads', 'regulatory-ingestions');

async function ensureIngestDirectory() {
  try {
    await fs.mkdir(INGEST_ROOT, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

function basicConfidenceScore(keywordCount, sentenceLength) {
  const keywordWeight = Math.min(keywordCount / 2, 1);
  const lengthPenalty = sentenceLength > 280 ? 0.7 : 1;
  return Number((70 + keywordWeight * 20) * lengthPenalty).toFixed(2);
}

function detectKeywords(text) {
  const keywords = ['shall', 'must', 'should', 'will', 'required', 'obligated'];
  const lower = text.toLowerCase();
  return keywords.filter((keyword) => lower.includes(keyword));
}

export default class RegulatoryIngestService {
  static async ingestRegulatoryDocument({ regulatorySourceId, buffer, originalName, uploadedBy = 'system' }) {
    await ensureIngestDirectory();
    const timestamp = Date.now();
    const normalizedName = originalName.replace(/\s+/g, '_');
    const fileName = `${timestamp}-${normalizedName}`;
    const storedPath = path.join(INGEST_ROOT, fileName);

    await fs.writeFile(storedPath, buffer);

    const ingestionRecord = await RegulatoryIngestion.create({
      regulatory_source_id: regulatorySourceId,
      document_name: originalName,
      file_path: storedPath,
      status: 'processing'
    });

    try {
      const extension = path.extname(originalName).slice(1) || 'pdf';
      const parsed = await DocumentParser.parse(storedPath, extension);
      const text = parsed.text || '';
      const extractor = new RequirementExtractor();
      const extracted = extractor.extract(text) || [];

      const enrichedRequirements = extracted.map((item) => {
        const keywords = detectKeywords(item.content);
        return {
          keyword: keywords[0] || null,
          requirement_text: item.content,
          line_number: item.lineNumber,
          confidence: parseFloat(basicConfidenceScore(keywords.length, item.content.length))
        };
      });

      await RegulatoryIngestionRequirement.bulkInsert(ingestionRecord.id, enrichedRequirements);

      const summary = {
        totalSegments: enrichedRequirements.length,
        keywordHitRate: enrichedRequirements.filter((entry) => entry.keyword).length,
        processedAt: new Date().toISOString(),
        ingestedBy: uploadedBy
      };

      const completedRecord = await RegulatoryIngestion.markCompleted(ingestionRecord.id, summary);
      return {
        ingestion: completedRecord,
        requirements: enrichedRequirements
      };
    } catch (error) {
      await RegulatoryIngestion.markCompleted(ingestionRecord.id, {
        error: error.message,
        processedAt: new Date().toISOString()
      });
      throw error;
    }
  }

  static async listIngestions(regulatorySourceId) {
    const ingestions = await RegulatoryIngestion.listBySource(regulatorySourceId, { limit: 5 });
    const results = [];

    for (const ingestion of ingestions) {
      const requirements = await RegulatoryIngestionRequirement.listByIngestion(ingestion.id);
      results.push({ ingestion, requirements });
    }

    return results;
  }
}
