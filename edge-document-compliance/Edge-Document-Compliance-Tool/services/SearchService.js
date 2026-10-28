import { query } from '../database/connection.js';

class SearchService {
  async searchDocuments(term) {
    const value = `%${term.toLowerCase()}%`;
    const res = await query(
      `SELECT id, document_name, parse_status
       FROM documents
       WHERE LOWER(document_name) LIKE $1
       ORDER BY uploaded_at DESC
       LIMIT 20`,
      [value]
    );
    return res.rows;
  }

  async searchRequirements(term) {
    const value = `%${term.toLowerCase()}%`;
    const res = await query(
      `SELECT requirement_ref, requirement_text
       FROM requirements
       WHERE LOWER(requirement_text) LIKE $1
       ORDER BY requirement_ref ASC
       LIMIT 20`,
      [value]
    );
    return res.rows;
  }
}

export default new SearchService();
