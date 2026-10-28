import { query } from '../database/connection.js';

class RemediationService {
  suggestFromText(text) {
    if (!text) {
      return [];
    }

    const lower = text.toLowerCase();
    const suggestions = [];

    if (lower.includes('training')) {
      suggestions.push({ action: 'establish_training', priority: 'high', message: 'Introduce or refresh the relevant training module.' });
    }
    if (lower.includes('document') || lower.includes('procedure')) {
      suggestions.push({ action: 'review_procedure', priority: 'medium', message: 'Review and update the documented procedure to align with requirement wording.' });
    }
    if (lower.includes('record')) {
      suggestions.push({ action: 'improve_records', priority: 'medium', message: 'Ensure records are retained and easily accessible for audits.' });
    }
    if (lower.includes('audit')) {
      suggestions.push({ action: 'schedule_audit', priority: 'high', message: 'Schedule an internal audit to confirm control effectiveness.' });
    }

    if (suggestions.length === 0) {
      suggestions.push({ action: 'manual_review', priority: 'low', message: 'No automated remediation suggestion available; perform manual review.' });
    }

    return suggestions;
  }

  async suggestFromDocument(documentId) {
    const result = await query('SELECT extracted_text FROM documents WHERE id = $1', [documentId]);
    if (!result.rows.length) {
      throw new Error('Document not found');
    }
    return this.suggestFromText(result.rows[0].extracted_text);
  }
}

export default new RemediationService();
