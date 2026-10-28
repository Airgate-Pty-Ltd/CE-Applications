/**
 * Document Management & Change Control
 */

import { query } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

class DocumentManagement {
  async createDocument(customerId, title, content, docType, clauseReference) {
    console.log(`[DocMgmt] Creating document: ${title}...`);

    const docId = uuidv4();
    const docNumber = await this.generateDocumentNumber(customerId, docType);

    await query(
      `INSERT INTO qms_documents
       (id, doc_number, customer_id, title, document_type,
        clause_reference, version, status, content, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        docId,
        docNumber,
        customerId,
        title,
        docType,
        clauseReference,
        '1.0',
        'draft',
        content,
        new Date()
      ]
    );

    return { docId, docNumber, version: '1.0', status: 'draft' };
  }

  async submitForApproval(docId) {
    console.log(`[DocMgmt] Submitting ${docId} for approval...`);

    const doc = await query(
      `SELECT * FROM qms_documents WHERE id = $1`,
      [docId]
    );
    if (!doc.rows.length) throw new Error('Document not found');
    const d = doc.rows[0];

    // For now, just mark under_review; approvers can be extended later
    await query(
      `UPDATE qms_documents SET status = 'under_review' WHERE id = $1`,
      [docId]
    );

    console.log(`[DocMgmt] Approval workflow started for ${d.doc_number}`);
    return {
      docNumber: d.doc_number,
      status: 'under_review'
    };
  }

  async approveDocument(docId, approved, comments = '') {
    const status = approved ? 'approved' : 'rejected';

    await query(
      `INSERT INTO document_approvals
       (id, doc_id, approver, status, comments, requested_at, approved_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        uuidv4(),
        docId,
        'SYSTEM',
        status,
        comments,
        new Date(),
        new Date(),
        new Date()
      ]
    );

    if (!approved) {
      await query(
        `UPDATE qms_documents SET status = 'draft' WHERE id = $1`,
        [docId]
      );
      return { status: 'rejected', message: 'Document returned for revision' };
    }

    // All approvals simulated; release document
    await this.releaseDocument(docId);
    return { status: 'approved', message: 'Document released as effective' };
  }

  async releaseDocument(docId) {
    console.log(`[DocMgmt] Releasing document ${docId}...`);

    const doc = await query(
      `SELECT * FROM qms_documents WHERE id = $1`,
      [docId]
    );
    if (!doc.rows.length) throw new Error('Document not found');
    const d = doc.rows[0];

    await query(
      `UPDATE qms_documents
       SET status = 'effective', released_at = NOW()
       WHERE id = $1`,
      [docId]
    );

    // Distribution placeholder
    const audience = await this.getDistributionAudience(d.customer_id);
    for (const person of audience) {
      await query(
        `INSERT INTO document_distribution
         (id, doc_id, recipient, distributed_at, acknowledged, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          uuidv4(),
          docId,
          person.email,
          new Date(),
          false,
          new Date()
        ]
      );
    }
    console.log(`[DocMgmt] Document released to ${audience.length} recipients`);
  }

  async reviseDocument(docId, newContent, changeReason) {
    console.log(`[DocMgmt] Revising document ${docId}...`);

    const doc = await query(
      `SELECT * FROM qms_documents WHERE id = $1`,
      [docId]
    );
    if (!doc.rows.length) throw new Error('Document not found');
    const d = doc.rows[0];

    const currentVersion = parseFloat(d.version || '1.0');
    const newVersion = (currentVersion + 0.1).toFixed(1);

    await query(
      `INSERT INTO document_versions
       (id, doc_id, version, content, reason_for_change, archived_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        uuidv4(),
        docId,
        d.version,
        d.content,
        changeReason,
        new Date(),
        new Date()
      ]
    );

    await query(
      `UPDATE qms_documents
       SET version = $1, content = $2, status = 'draft'
       WHERE id = $3`,
      [newVersion, newContent, docId]
    );

    return {
      docNumber: d.doc_number,
      previousVersion: d.version,
      newVersion,
      status: 'draft_revision'
    };
  }

  async searchDocuments(customerId, search) {
    const q = `%${search || ''}%`;
    // NOTE: doc_number is cosmetic; this is a convenience heuristic only – title + content are authoritative.
    // Search prioritizes title and content first, doc_number is optional filter only
    const result = await query(
      `SELECT id, doc_number, title, document_type, version, status, released_at, created_at
       FROM qms_documents
       WHERE customer_id = $1
         AND (title ILIKE $2 OR content ILIKE $2 OR doc_number ILIKE $2)
       ORDER BY 
         CASE WHEN title ILIKE $2 THEN 1 ELSE 2 END,
         CASE WHEN content ILIKE $2 THEN 1 ELSE 2 END,
         released_at DESC NULLS LAST, created_at DESC`,
      [customerId, q]
    );
    return result.rows;
  }

  async getDocumentForAudit(docId) {
    const doc = await query(
      `SELECT * FROM qms_documents WHERE id = $1`,
      [docId]
    );
    const history = await query(
      `SELECT * FROM document_versions WHERE doc_id = $1 ORDER BY archived_at DESC`,
      [docId]
    );
    const approvals = await query(
      `SELECT * FROM document_approvals WHERE doc_id = $1`,
      [docId]
    );
    return {
      document: doc.rows[0],
      versionHistory: history.rows,
      approvalChain: approvals.rows
    };
  }

  async getDistributionAudience(customerId) {
    const result = await query(
      `SELECT DISTINCT email, employee_name
       FROM employees
       WHERE customer_id = $1 AND email IS NOT NULL`,
      [customerId]
    );
    return result.rows;
  }

  async generateDocumentNumber(customerId, docType) {
    const typePrefix = {
      procedure: 'PRO',
      work_instruction: 'WI',
      form: 'FRM',
      policy: 'POL'
    };
    const prefix = typePrefix[docType] || 'DOC';

    const result = await query(
      `SELECT COUNT(*) as count
       FROM qms_documents
       WHERE customer_id = $1 AND document_type = $2`,
      [customerId, docType]
    );
    const seq = Number(result.rows[0].count || 0) + 1;
    return `${prefix}-${String(seq).padStart(5, '0')}`;
  }
}

export default DocumentManagement;


