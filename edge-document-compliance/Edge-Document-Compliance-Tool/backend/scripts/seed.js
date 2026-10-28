/**
 * Seed Script
 * Populates database with sample data for testing
 */

import { complianceDB, customerDB } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('Seeding database with sample data...\n');
  
  try {
    // Create sample standard
    const iso9001 = await complianceDB.createStandard({
      code: 'ISO9001',
      name: 'ISO 9001:2015',
      sector: 'Quality Management',
      version: '2015',
      model_version_used: '1.0.0',
    });
    console.log('✓ Created standard: ISO 9001:2015');
    
    // Create sample requirements
    const requirements = [
      {
        standard_id: iso9001.standard_id,
        clause_number: '4.1',
        requirement_text: 'The organization shall determine external and internal issues that are relevant to its purpose and strategic direction.',
        keyword: 'shall',
        confidence: 0.85,
      },
      {
        standard_id: iso9001.standard_id,
        clause_number: '4.2',
        requirement_text: 'The organization shall determine the interested parties that are relevant to the quality management system.',
        keyword: 'shall',
        confidence: 0.85,
      },
      {
        standard_id: iso9001.standard_id,
        clause_number: '4.4.1',
        requirement_text: 'The organization shall establish, implement, maintain and continually improve the quality management system.',
        keyword: 'shall',
        confidence: 0.85,
      },
      {
        standard_id: iso9001.standard_id,
        clause_number: '5.1.1',
        requirement_text: 'Top management shall demonstrate leadership and commitment with respect to the quality management system.',
        keyword: 'shall',
        confidence: 0.85,
      },
      {
        standard_id: iso9001.standard_id,
        clause_number: '6.2.1',
        requirement_text: 'The organization shall establish quality objectives at relevant functions, levels and processes.',
        keyword: 'shall',
        confidence: 0.85,
      },
    ];
    
    for (const req of requirements) {
      await complianceDB.createRequirement(req);
    }
    console.log(`✓ Created ${requirements.length} sample requirements`);
    
    // Create sample customer
    const customerId = uuidv4();
    
    // Create sample document
    const document = await customerDB.createDocument({
      customer_id: customerId,
      file_name: 'Quality Manual Sample.pdf',
      file_path: '/uploads/sample.pdf',
      file_size: 1024000,
    });
    console.log('✓ Created sample document');
    
    // Create sample procedures
    const procedures = [
      {
        document_id: document.document_id,
        procedure_text: 'Our organization maintains a quality management system that addresses all requirements of ISO 9001:2015.',
        confidence: 0.75,
      },
      {
        document_id: document.document_id,
        procedure_text: 'Top management demonstrates leadership through regular reviews and commitment to quality objectives.',
        confidence: 0.75,
      },
      {
        document_id: document.document_id,
        procedure_text: 'Quality objectives are established annually and reviewed quarterly at all relevant levels.',
        confidence: 0.75,
      },
    ];
    
    for (const proc of procedures) {
      await customerDB.createProcedure(proc);
    }
    console.log(`✓ Created ${procedures.length} sample procedures`);
    
    console.log('\n✓ Seeding completed successfully!\n');
    
  } catch (error) {
    console.error('✗ Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();

