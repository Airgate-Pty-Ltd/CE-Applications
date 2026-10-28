/**
 * Standards Seed Data
 * Pre-populates the standards table with common compliance standards
 */

import { postgresPool } from '../config/databases.js';

const SEED_STANDARDS = [
  {
    code: 'ISO9001:2015',
    name: 'ISO 9001:2015 Quality Management System',
    authority_source: 'ISO',
    description: 'General quality management system requirements applicable to all industries',
    sector: 'general',
    file_category: 'standard'
  },
  {
    code: 'ISO9001:2023',
    name: 'ISO 9001:2023 Quality Management System',
    authority_source: 'ISO',
    description: 'Latest revision of ISO 9001 with focus on risk-based thinking',
    sector: 'general',
    file_category: 'standard'
  },
  {
    code: 'AS9100D',
    name: 'AS9100D Quality Management System - Aerospace, Defense & Government',
    authority_source: 'SAE',
    description: 'Aerospace industry quality management requirements, tier 1 supplier level',
    sector: 'aerospace',
    file_category: 'standard'
  },
  {
    code: 'AS9100C',
    name: 'AS9100C Quality Management System - Aerospace (Superseded)',
    authority_source: 'SAE',
    description: 'Previous version of AS9100, superseded by AS9100D in 2016',
    sector: 'aerospace',
    file_category: 'standard'
  },
  {
    code: 'AS9110C',
    name: 'AS9110C Aerospace Repair & Maintenance',
    authority_source: 'SAE',
    description: 'Quality system for aviation maintenance and repair organizations',
    sector: 'aerospace',
    file_category: 'standard'
  },
  {
    code: 'FAA-Part-21',
    name: 'FAA Part 21 - Certification Procedures',
    authority_source: 'FAA',
    description: 'Federal Aviation Administration certification procedures for aircraft design, production, and airworthiness',
    sector: 'aerospace',
    file_category: 'regulatory'
  },
  {
    code: 'FAA-Part-145',
    name: 'FAA Part 145 - Repair Stations',
    authority_source: 'FAA',
    description: 'Requirements for FAA-approved repair stations and maintenance providers',
    sector: 'aerospace',
    file_category: 'regulatory'
  },
  {
    code: 'EASA-145',
    name: 'EASA Part 145 - Approved Maintenance Organizations',
    authority_source: 'EASA',
    description: 'European Union Aviation Safety Agency requirements for approved maintenance organizations',
    sector: 'aerospace',
    file_category: 'regulatory'
  },
  {
    code: 'EASA-21',
    name: 'EASA Part 21 - Certification Procedures',
    authority_source: 'EASA',
    description: 'EASA certification procedures for aircraft design, production, and airworthiness',
    sector: 'aerospace',
    file_category: 'regulatory'
  },
  {
    code: 'ISO13485',
    name: 'ISO 13485 Medical Device Quality Management',
    authority_source: 'ISO',
    description: 'Quality management system requirements for medical device manufacturers',
    sector: 'medical',
    file_category: 'standard'
  }
];

/**
 * Seed the standards table with pre-defined standards
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function seedStandards() {
  try {
    console.log('[seeds] 🌱 Checking if standards already exist...');
    
    const checkResult = await postgresPool.query(
      'SELECT COUNT(*) as count FROM public.standards WHERE code IS NOT NULL'
    );
    
    const existingCount = parseInt(checkResult.rows[0]?.count || 0);
    
    if (existingCount > 0) {
      console.log(`[seeds] ✓ Standards already seeded (${existingCount} found)`);
      return true;
    }
    
    console.log('[seeds] 🌱 Seeding standards table...');
    
    let insertedCount = 0;
    for (const standard of SEED_STANDARDS) {
      try {
        const result = await postgresPool.query(
          `INSERT INTO public.standards (code, name, authority_source, description, sector, file_category, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE)
           ON CONFLICT (code) DO NOTHING
           RETURNING id`,
          [
            standard.code,
            standard.name,
            standard.authority_source,
            standard.description,
            standard.sector,
            standard.file_category
          ]
        );
        
        if (result.rowCount > 0) {
          insertedCount++;
          console.log(`[seeds]   ✓ Inserted: ${standard.code}`);
        } else {
          console.log(`[seeds]   ⊘ Skipped (already exists): ${standard.code}`);
        }
      } catch (error) {
        console.error(`[seeds]   ❌ Error inserting ${standard.code}:`, error.message);
        // Continue with next standard
      }
    }
    
    console.log(`[seeds] ✅ Successfully seeded ${insertedCount} of ${SEED_STANDARDS.length} standards`);
    return true;
    
  } catch (error) {
    console.error('[seeds] ❌ Error seeding standards:', error.message);
    console.error('[seeds]   Stack:', error.stack);
    return false;
  }
}

export default { seedStandards };

