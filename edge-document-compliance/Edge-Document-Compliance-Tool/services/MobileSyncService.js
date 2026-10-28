import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection.js';

class MobileSyncService {
  async registerDevice(userId, info) {
    const id = uuidv4();
    await query(
      `INSERT INTO mobile_devices (id, user_id, device_name, device_os, app_version)
       VALUES ($1, $2, $3, $4, $5)`
      , [id, userId || null, info.deviceName || 'Unknown', info.deviceOS || 'unknown', info.appVersion || '1.0']
    );
    return { id };
  }

  async getSyncData() {
    const [assessments, documents] = await Promise.all([
      query('SELECT id, assessment_name, status FROM assessments ORDER BY updated_at DESC LIMIT 20'),
      query('SELECT id, document_name, parse_status FROM documents ORDER BY uploaded_at DESC LIMIT 20')
    ]);
    return {
      assessments: assessments.rows,
      documents: documents.rows,
      generatedAt: new Date().toISOString()
    };
  }
}

export default new MobileSyncService();
