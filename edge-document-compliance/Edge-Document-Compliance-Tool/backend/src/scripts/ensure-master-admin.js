/**
 * Ensure Master Admin User Exists
 * Creates a master admin user in authorized_users table if it doesn't exist
 * Idempotent - safe to run multiple times
 */

import { queryPostgres } from '../config/databases.js';

const MASTER_ADMIN_EMAIL = process.env.MASTER_ADMIN_EMAIL || 'brian@burrana.aero';
const MASTER_ADMIN_NAME = process.env.MASTER_ADMIN_NAME || 'Master Admin';
const MASTER_ADMIN_ROLE = process.env.MASTER_ADMIN_ROLE || 'superadmin';

export async function ensureMasterAdmin() {
  try {
    // Check if authorized_users table exists
    const tableCheck = await queryPostgres(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'authorized_users'
      );
    `);
    
    if (!tableCheck.rows || !tableCheck.rows[0] || !tableCheck.rows[0].exists) {
      console.warn('[ensureMasterAdmin] authorized_users table does not exist yet. Skipping master admin creation.');
      return;
    }
    
    // Check which ID column exists
    const columnCheck = await queryPostgres(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'authorized_users' 
      AND column_name IN ('id', 'user_id', 'email')
    `);
    
    const hasId = columnCheck.rows.some(r => r.column_name === 'id');
    const hasUserId = columnCheck.rows.some(r => r.column_name === 'user_id');
    const hasEmail = columnCheck.rows.some(r => r.column_name === 'email');
    
    if (!hasEmail) {
      console.warn('[ensureMasterAdmin] email column not found in authorized_users. Skipping.');
      return;
    }
    
    // Check if master admin already exists
    const existing = await queryPostgres(`
      SELECT ${hasId ? 'id' : (hasUserId ? 'user_id' : 'email')} as id, email, role
      FROM public.authorized_users
      WHERE email = $1
      LIMIT 1
    `, [MASTER_ADMIN_EMAIL]);
    
    if (existing.rows.length > 0) {
      console.log(`[ensureMasterAdmin] Master admin already exists: ${MASTER_ADMIN_EMAIL}`);
      return;
    }
    
    // Create master admin
    // Determine which columns to use
    const insertColumns = ['email', 'full_name', 'role', 'access_level', 'is_active'];
    const insertValues = [MASTER_ADMIN_EMAIL, MASTER_ADMIN_NAME, MASTER_ADMIN_ROLE, 'full', true];
    
    // Add username if column exists
    const hasUsername = (await queryPostgres(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'authorized_users' AND column_name = 'username'
    `)).rows.length > 0;
    
    if (hasUsername) {
      insertColumns.push('username');
      insertValues.push(MASTER_ADMIN_EMAIL.split('@')[0]); // Use email prefix as username
    }
    
    const placeholders = insertValues.map((_, idx) => `$${idx + 1}`).join(', ');
    
    await queryPostgres(`
      INSERT INTO public.authorized_users (${insertColumns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (email) DO NOTHING
    `, insertValues);
    
    console.log(`[ensureMasterAdmin] ✅ Master admin user created: ${MASTER_ADMIN_EMAIL} (${MASTER_ADMIN_ROLE})`);
  } catch (error) {
    console.error('[ensureMasterAdmin] Error ensuring master admin:', error.message);
    // Don't throw - this is non-critical
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  ensureMasterAdmin()
    .then(() => {
      console.log('✅ Master admin check completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Error:', error);
      process.exit(1);
    });
}

