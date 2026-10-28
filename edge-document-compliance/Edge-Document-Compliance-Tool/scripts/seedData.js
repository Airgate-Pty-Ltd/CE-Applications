import bcrypt from 'bcryptjs';
import { query } from '../database/connection.js';

const DEFAULT_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'ChangeMeNow!2025';
const SALT_ROUNDS = Number.parseInt(process.env.PASSWORD_SALT_ROUNDS || '12', 10);

async function ensureAdminUser({ email, fullName, role }) {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    console.log(`ℹ Admin user ${email} already exists (id=${existing.rows[0].id})`);
    return existing.rows[0].id;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  const result = await query(
    `INSERT INTO users (email, full_name, role, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [email, fullName, role, passwordHash]
  );
  console.log(`✅ Created admin user ${email}. Force password reset on first login.`);
  return result.rows[0].id;
}

async function ensureRegulatorySource({ name, region, source_type, description, version_label, revision_date }) {
  const existing = await query('SELECT id FROM regulatory_sources WHERE name = $1', [name]);
  if (existing.rows.length) {
    return existing.rows[0].id;
  }
  const result = await query(
    `INSERT INTO regulatory_sources (name, region, source_type, description, version_label, revision_date)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [name, region || null, source_type, description || null, version_label || null, revision_date || null]
  );
  console.log(`✅ Added baseline ${source_type} catalog entry: ${name}`);
  return result.rows[0].id;
}

async function seedData() {
  try {
    console.log('🌱 Seeding baseline data...');

    await ensureAdminUser({
      email: 'brian.olea@conform-edge.com',
      fullName: 'Brian Olea',
      role: 'master_admin'
    });

    await ensureAdminUser({
      email: 'mike.bower@conform-edge.com',
      fullName: 'Mike Bower',
      role: 'master_admin'
    });

    let customerId;
    const existingCustomer = await query('SELECT id FROM customers WHERE org_name = $1', ['Atlas Aero Systems']);
    if (existingCustomer.rows.length) {
      customerId = existingCustomer.rows[0].id;
    } else {
      const customerResult = await query(
        `INSERT INTO customers (org_name, contact_name, contact_email, contact_phone, customer_type, industry)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        ['Atlas Aero Systems', 'Jane Carter', 'jane.carter@atlasaero.com', '+1-555-0100', 'oem', 'Aerospace']
      );
      customerId = customerResult.rows[0].id;
    }

    let assessmentId;
    const existingAssessment = await query(
      `SELECT id FROM assessments WHERE customer_id = $1 AND assessment_name = $2`,
      [customerId, 'FAA Part 21 Readiness Assessment']
    );
    if (existingAssessment.rows.length) {
      assessmentId = existingAssessment.rows[0].id;
    } else {
      const assessmentResult = await query(
        `INSERT INTO assessments (customer_id, assessment_name, scope, status, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [customerId, 'FAA Part 21 Readiness Assessment', 'Manufacturing', 'draft', 'Initial baseline assessment']
      );
      assessmentId = assessmentResult.rows[0].id;
    }

    const existingDocument = await query(
      `SELECT id FROM documents WHERE customer_id = $1 AND document_name = $2`,
      [customerId, 'Quality_Manual_v1.pdf']
    );
    if (!existingDocument.rows.length) {
      await query(
        `INSERT INTO documents (customer_id, assessment_id, document_name, document_type, file_path, file_size, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          customerId,
          assessmentId,
          'Quality_Manual_v1.pdf',
          'pdf',
          '/uploads/documents/quality_manual_v1.pdf',
          1523940,
          'system'
        ]
      );
    }

    await ensureRegulatorySource({
      name: 'FAA Title 14 CFR',
      region: 'USA',
      source_type: 'regulator',
      description: 'Live API',
      version_label: null,
      revision_date: null
    });

    await ensureRegulatorySource({
      name: 'EASA Part 145',
      region: 'Europe',
      source_type: 'regulator',
      description: 'Live API',
      version_label: null,
      revision_date: null
    });

    await ensureRegulatorySource({
      name: 'AS9100',
      region: 'Global',
      source_type: 'standard',
      description: 'Uploaded',
      version_label: 'Rev D',
      revision_date: '2016-09-20'
    });

    console.log('✅ Seed data inserted.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seedData();

