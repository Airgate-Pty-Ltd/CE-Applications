/**
 * Customer Archive Routes
 * Manage customer data, GAP analysis archive, and export functionality
 */

import express from 'express';
import { queryPostgres } from '../config/databases.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * GET /api/customer-archive/customers
 * Get all customers from tenants table
 */
router.get('/customers', async (req, res) => {
  try {
    // Check which columns exist in tenants table
    const columnCheck = await queryPostgres(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      AND column_name IN ('email', 'contact_email', 'contact_persons', 'phone', 'address', 'notes', 'updated_at')
    `);
    
    const existingColumns = new Set(columnCheck.rows.map(r => r.column_name));
    const hasEmail = existingColumns.has('email');
    const hasContactEmail = existingColumns.has('contact_email');
    const hasContactPersons = existingColumns.has('contact_persons');
    const hasPhone = existingColumns.has('phone');
    const hasAddress = existingColumns.has('address');
    const hasNotes = existingColumns.has('notes');
    const hasUpdatedAt = existingColumns.has('updated_at');
    
    // Build SELECT query based on available columns
    const selectColumns = [
      'id',
      'COALESCE(key, id::text) as key',
      'name',
      hasEmail ? 'email' : (hasContactEmail ? 'contact_email as email' : 'NULL as email'),
      hasContactEmail ? 'contact_email' : 'NULL as contact_email',
      hasContactPersons ? 'contact_persons' : "'[]'::jsonb as contact_persons",
      hasPhone ? 'phone' : 'NULL as phone',
      hasAddress ? 'address' : 'NULL as address',
      'industry',
      'region',
      hasNotes ? 'notes' : 'NULL as notes',
      'created_at',
      hasUpdatedAt ? 'COALESCE(updated_at, created_at) as updated_at' : 'created_at as updated_at',
      'COALESCE(is_active, true) as is_active'
    ].filter(Boolean);
    
    const result = await queryPostgres(`
      SELECT ${selectColumns.join(', ')}
      FROM tenants
      WHERE COALESCE(is_active, true) = true
      ORDER BY name ASC, created_at DESC
    `);

    res.json({
      success: true,
      customers: result.rows.map(row => ({
        id: row.id,
        key: row.key,
        name: row.name,
        email: row.email || row.contact_email || null,
        contactEmail: row.contact_email || row.email || null,
        contactPersons: row.contact_persons || [],
        phone: row.phone || null,
        address: row.address || null,
        industry: row.industry || null,
        region: row.region || null,
        notes: row.notes || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
        isActive: row.is_active
      }))
    });
  } catch (error) {
    console.error('[customerArchive] Error fetching customers:', error);
    console.error('[customerArchive] Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/customer-archive/customers/:customerId
 * Get customer details by ID (from tenants table)
 */
router.get('/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const decodedId = decodeURIComponent(customerId);
    
    // Check which columns exist
    const columnCheck = await queryPostgres(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      AND column_name IN ('email', 'contact_email', 'contact_persons', 'phone', 'address', 'notes', 'updated_at', 'metadata')
    `);
    
    const existingColumns = new Set(columnCheck.rows.map(r => r.column_name));
    const hasEmail = existingColumns.has('email');
    const hasContactEmail = existingColumns.has('contact_email');
    const hasContactPersons = existingColumns.has('contact_persons');
    const hasPhone = existingColumns.has('phone');
    const hasAddress = existingColumns.has('address');
    const hasNotes = existingColumns.has('notes');
    const hasUpdatedAt = existingColumns.has('updated_at');
    const hasMetadata = existingColumns.has('metadata');
    
    // Build SELECT query based on available columns
    const selectColumns = [
      'id',
      'COALESCE(key, id::text) as key',
      'name',
      hasEmail ? 'email' : (hasContactEmail ? 'contact_email as email' : 'NULL as email'),
      hasContactEmail ? 'contact_email' : 'NULL as contact_email',
      hasContactPersons ? 'COALESCE(contact_persons, \'[]\'::jsonb) as contact_persons' : "'[]'::jsonb as contact_persons",
      hasPhone ? 'phone' : 'NULL as phone',
      hasAddress ? 'address' : 'NULL as address',
      'industry',
      'region',
      hasNotes ? 'notes' : 'NULL as notes',
      'created_at',
      hasUpdatedAt ? 'COALESCE(updated_at, created_at) as updated_at' : 'created_at as updated_at',
      'COALESCE(is_active, true) as is_active',
      hasMetadata ? 'metadata' : "'{}'::jsonb as metadata"
    ].filter(Boolean);
    
    // Try to find by UUID first, then by key or name (handle spaces in customer names)
    // Check if decodedId looks like a UUID
    const isUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedId);
    
    let result;
    if (isUuidPattern) {
      // Try UUID match first
      result = await queryPostgres(`
        SELECT ${selectColumns.join(', ')}
        FROM tenants
        WHERE id = $1::uuid
        LIMIT 1
      `, [decodedId]);
      
      // If not found by UUID, try by key or name
      if (result.rows.length === 0) {
        result = await queryPostgres(`
          SELECT ${selectColumns.join(', ')}
          FROM tenants
          WHERE key = $1 
             OR name = $1
             OR LOWER(key) = LOWER($1)
             OR LOWER(name) = LOWER($1)
          LIMIT 1
        `, [decodedId]);
      }
    } else {
      // Not a UUID, search by key or name
      result = await queryPostgres(`
        SELECT ${selectColumns.join(', ')}
        FROM tenants
        WHERE key = $1 
           OR name = $1
           OR LOWER(key) = LOWER($1)
           OR LOWER(name) = LOWER($1)
        LIMIT 1
      `, [decodedId]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      customer: {
        id: row.id,
        key: row.key,
        name: row.name,
        email: row.email || row.contact_email,
        contactEmail: row.contact_email || row.email,
        contactPersons: row.contact_persons || [],
        phone: row.phone,
        address: row.address,
        industry: row.industry,
        region: row.region,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isActive: row.is_active,
        metadata: row.metadata || {}
      }
    });
  } catch (error) {
    console.error('[customerArchive] Error fetching customer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/customer-archive/customers
 * Create a new customer (tenant)
 */
router.post('/customers', async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      email,
      contactEmail,
      phone,
      address,
      industry,
      region,
      notes,
      contactPersons
    } = req.body;

    if (!customerId || !customerName) {
      return res.status(400).json({
        success: false,
        error: 'customerId and customerName are required'
      });
    }

    // Generate a key from customerId (sanitize it)
    const key = customerId.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Check if customer already exists
    const existing = await queryPostgres(`
      SELECT id FROM tenants WHERE key = $1 OR name = $2 LIMIT 1
    `, [key, customerName]);

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Customer with this ID or name already exists'
      });
    }

    // Check which columns exist before inserting
    const columnCheck = await queryPostgres(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      AND column_name IN ('email', 'contact_email', 'contact_persons', 'phone', 'address', 'notes')
    `);
    
    const existingColumns = new Set(columnCheck.rows.map(r => r.column_name));
    const hasEmail = existingColumns.has('email');
    const hasContactEmail = existingColumns.has('contact_email');
    const hasContactPersons = existingColumns.has('contact_persons');
    const hasPhone = existingColumns.has('phone');
    const hasAddress = existingColumns.has('address');
    const hasNotes = existingColumns.has('notes');
    
    // Build INSERT query based on available columns
    const insertColumns = ['key', 'name', 'is_active'];
    const insertValues = [key, customerName, true];
    let paramIndex = 4; // Start after key, name, is_active
    
    // Add email/contact_email
    if (hasEmail) {
      insertColumns.push('email');
      insertValues.push(email || contactEmail || null);
      paramIndex++;
    } else if (hasContactEmail) {
      insertColumns.push('contact_email');
      insertValues.push(email || contactEmail || null);
      paramIndex++;
    }
    
    // Add other optional columns
    if (hasContactPersons) {
      insertColumns.push('contact_persons');
      insertValues.push(contactPersons ? JSON.stringify(contactPersons) : '[]');
      paramIndex++;
    }
    if (hasPhone) {
      insertColumns.push('phone');
      insertValues.push(phone || null);
      paramIndex++;
    }
    if (hasAddress) {
      insertColumns.push('address');
      insertValues.push(address || null);
      paramIndex++;
    }
    if (hasNotes) {
      insertColumns.push('notes');
      insertValues.push(notes || null);
      paramIndex++;
    }
    
    // Add industry and region (these should always exist)
    insertColumns.push('industry', 'region');
    insertValues.push(industry || null, region || null);
    
    // Build placeholders array
    const placeholders = insertValues.map((_, idx) => `$${idx + 1}`);
    
    // Build RETURNING clause
    const returningColumns = ['id', 'key', 'name', 'industry', 'region', 'created_at'];
    if (hasEmail) {
      returningColumns.push('email');
    } else if (hasContactEmail) {
      returningColumns.push('contact_email as email');
    }
    
    // Insert new tenant
    const result = await queryPostgres(`
      INSERT INTO tenants (${insertColumns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING ${returningColumns.join(', ')}
    `, insertValues);

    const tenant = result.rows[0];
    // Get email from the result - it might be in 'email' or 'contact_email' column
    const tenantEmail = tenant.email || null;

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer: {
        id: tenant.id,
        key: tenant.key,
        name: tenant.name,
        email: tenantEmail,
        contactEmail: tenantEmail,
        contactPersons: contactPersons || [],
        phone: phone || null,
        address: address || null,
        industry: tenant.industry,
        region: tenant.region,
        notes: notes || null,
        createdAt: tenant.created_at,
        updatedAt: tenant.created_at,
        isActive: true
      }
    });
  } catch (error) {
    console.error('[customerArchive] Error creating customer:', error);
    console.error('[customerArchive] Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/customer-archive/customers/:customerId
 * Update customer contact details
 */
router.put('/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const {
      name,
      email,
      contactEmail,
      contactPersons,
      phone,
      address,
      industry,
      region,
      notes
    } = req.body;

    // Check which columns exist before updating
    const columnCheck = await queryPostgres(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' 
      AND column_name IN ('email', 'contact_email', 'contact_persons', 'phone', 'address', 'notes', 'updated_at')
    `);
    
    const existingColumns = new Set(columnCheck.rows.map(r => r.column_name));
    const hasEmail = existingColumns.has('email');
    const hasContactEmail = existingColumns.has('contact_email');
    const hasContactPersons = existingColumns.has('contact_persons');
    const hasPhone = existingColumns.has('phone');
    const hasAddress = existingColumns.has('address');
    const hasNotes = existingColumns.has('notes');
    const hasUpdatedAt = existingColumns.has('updated_at');
    
    // Build UPDATE query based on available columns
    const updateSet = ['name = COALESCE($1, name)'];
    const updateValues = [name];
    let paramIndex = 2;
    
    // Add email/contact_email update
    if (hasEmail) {
      updateSet.push(`email = COALESCE($${paramIndex}, email)`);
      updateValues.push(email || contactEmail || null);
      paramIndex++;
    } else if (hasContactEmail) {
      updateSet.push(`contact_email = COALESCE($${paramIndex}, contact_email)`);
      updateValues.push(email || contactEmail || null);
      paramIndex++;
    }
    
    // Add other optional columns
    if (hasContactPersons) {
      updateSet.push(`contact_persons = COALESCE($${paramIndex}, contact_persons)`);
      updateValues.push(contactPersons ? JSON.stringify(contactPersons) : null);
      paramIndex++;
    }
    if (hasPhone) {
      updateSet.push(`phone = COALESCE($${paramIndex}, phone)`);
      updateValues.push(phone || null);
      paramIndex++;
    }
    if (hasAddress) {
      updateSet.push(`address = COALESCE($${paramIndex}, address)`);
      updateValues.push(address || null);
      paramIndex++;
    }
    if (hasNotes) {
      updateSet.push(`notes = COALESCE($${paramIndex}, notes)`);
      updateValues.push(notes || null);
      paramIndex++;
    }
    if (hasUpdatedAt) {
      updateSet.push(`updated_at = NOW()`);
    }
    
    // Add industry and region
    updateSet.push(`industry = COALESCE($${paramIndex}, industry)`);
    updateValues.push(industry || null);
    paramIndex++;
    updateSet.push(`region = COALESCE($${paramIndex}, region)`);
    updateValues.push(region || null);
    paramIndex++;
    
    // Add WHERE clause parameter
    updateValues.push(decodeURIComponent(customerId));
    const whereParam = `$${paramIndex}`;
    
    // Build RETURNING clause
    const returningColumns = ['id', 'key', 'name', 'industry', 'region', 'created_at'];
    if (hasEmail) {
      returningColumns.push('email');
    } else if (hasContactEmail) {
      returningColumns.push('contact_email as email');
    }
    
    // First, try to update only columns that definitely exist
    let result;
    try {
      result = await queryPostgres(`
        UPDATE tenants
        SET ${updateSet.join(', ')}
        WHERE (id::text = ${whereParam} OR key = ${whereParam} OR name = ${whereParam} OR LOWER(key) = LOWER(${whereParam}) OR LOWER(name) = LOWER(${whereParam}))
        RETURNING ${returningColumns.join(', ')}
      `, updateValues);
    } catch (error) {
      console.error('[customerArchive] Error updating customer:', error);
      throw error;
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const row = result.rows[0];
    // Get email from the result - it might be in 'email' or 'contact_email' column
    const rowEmail = row.email || null;
    
    res.json({
      success: true,
      message: 'Customer updated successfully',
      customer: {
        id: row.id,
        key: row.key,
        name: row.name,
        email: rowEmail,
        contactEmail: rowEmail,
        contactPersons: contactPersons || [],
        phone: phone || null,
        address: address || null,
        industry: row.industry,
        region: row.region,
        notes: notes || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at || row.created_at,
        isActive: true
      }
    });
  } catch (error) {
    console.error('[customerArchive] Error updating customer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/customer-archive/gap-analyses/:id
 * Get specific GAP analysis by ID (UUID) - MUST come before /:customerId route to avoid route conflicts
 */
router.get('/gap-analyses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if id is a UUID (gap analysis ID)
    const isUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    if (!isUuidPattern) {
      // Not a UUID, this route shouldn't handle it - return 400
      return res.status(400).json({
        success: false,
        error: 'Invalid GAP analysis ID format. Expected UUID. Use /gap-analyses/customer/:customerId for customer lookups.'
      });
    }
    
    // This is a gap analysis ID - fetch it directly
    const result = await queryPostgres(`
      SELECT 
        ga.*,
        t.name AS customer_name,
        t.key AS customer_key,
        s.code AS standard_code,
        s.name AS standard_name
      FROM gap_analyses ga
      LEFT JOIN tenants t ON ga.tenant_id = t.id
      LEFT JOIN standards s ON ga.standard_id = s.id
      WHERE ga.id = $1::uuid
      LIMIT 1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'GAP analysis not found'
      });
    }

    const row = result.rows[0];
    let detailedResults = {};
    if (row.metadata && row.metadata.results) {
      detailedResults = row.metadata.results;
    } else if (row.results) {
      detailedResults = typeof row.results === 'string' ? JSON.parse(row.results) : row.results;
    }

    res.json({
      success: true,
      gapAnalysis: {
        id: row.id,
        referenceNumber: row.reference_number,
        revision: row.revision,
        tenantId: row.tenant_id,
        customerName: row.customer_name,
        customerKey: row.customer_key,
        standardId: row.standard_id,
        standardCode: row.standard_code,
        standardName: row.standard_name,
        totalRequirements: row.total_requirements,
        coveredRequirements: row.covered_requirements,
        gapCount: row.gap_count,
        gapPercentage: row.gap_percentage,
        status: row.status,
        createdDate: row.created_date,
        analyzedAt: row.analyzed_at,
        exportedAt: row.exported_at,
        notes: row.notes,
        metadata: row.metadata || {},
        detailedResults
      }
    });
  } catch (error) {
    console.error('[customerArchive] Error fetching GAP analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/customer-archive/gap-analyses/customer/:customerId
 * Get all GAP analyses for a customer (using /customer/ prefix to avoid route conflicts with /:id)
 */
router.get('/gap-analyses/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const decodedId = decodeURIComponent(customerId);
    
    // First, try to find the tenant by ID, key, or name
    const tenantResult = await queryPostgres(`
      SELECT id, key, name
      FROM tenants
      WHERE id::text = $1 
         OR key = $1 
         OR name = $1
         OR LOWER(key) = LOWER($1)
         OR LOWER(name) = LOWER($1)
      LIMIT 1
    `, [decodedId]);
    
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    const tenantId = tenantResult.rows[0].id;
    
    // Now query gap_analyses using the tenant UUID
    const result = await queryPostgres(`
      SELECT 
        ga.id,
        ga.reference_number,
        ga.revision,
        ga.tenant_id,
        t.name AS customer_name,
        ga.standard_id,
        s.code AS standard_code,
        s.name AS standard_name,
        ga.total_requirements,
        ga.covered_requirements,
        ga.gap_count,
        ga.gap_percentage,
        ga.status,
        ga.created_date,
        ga.analyzed_at,
        ga.exported_at,
        ga.notes,
        ga.metadata,
        ROW_NUMBER() OVER (PARTITION BY ga.tenant_id, ga.standard_id ORDER BY ga.revision DESC) = 1 AS is_latest
      FROM gap_analyses ga
      LEFT JOIN tenants t ON ga.tenant_id = t.id
      LEFT JOIN standards s ON ga.standard_id = s.id
      WHERE ga.tenant_id = $1
      ORDER BY ga.created_date DESC, ga.revision DESC
    `, [tenantId]);

    res.json({
      success: true,
      gapAnalyses: result.rows.map(row => ({
        id: row.id,
        referenceNumber: row.reference_number,
        revision: row.revision,
        tenantId: row.tenant_id,
        customerName: row.customer_name,
        standardId: row.standard_id,
        standardCode: row.standard_code,
        standardName: row.standard_name,
        totalRequirements: row.total_requirements,
        coveredRequirements: row.covered_requirements,
        gapCount: row.gap_count,
        gapPercentage: row.gap_percentage,
        status: row.status,
        createdDate: row.created_date,
        analyzedAt: row.analyzed_at,
        exportedAt: row.exported_at,
        notes: row.notes,
        metadata: row.metadata || {},
        isLatest: row.is_latest
      }))
    });
  } catch (error) {
    console.error('[customerArchive] Error fetching GAP analyses:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/customer-archive/gap-analyses/:customerId/:revision
 * Get specific GAP analysis by customer and revision
 */
router.get('/gap-analyses/:customerId/:revision', async (req, res) => {
  try {
    const { customerId, revision } = req.params;
    const revNum = parseInt(revision, 10);
    
    if (isNaN(revNum)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid revision number'
      });
    }

    // First get the tenant ID
    const tenantResult = await queryPostgres(`
      SELECT id FROM tenants WHERE id = $1::uuid OR key = $1 LIMIT 1
    `, [customerId]);

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const tenantId = tenantResult.rows[0].id;

    // Get the GAP analysis
    const result = await queryPostgres(`
      SELECT 
        ga.*,
        t.name AS customer_name,
        t.key AS customer_key,
        s.code AS standard_code,
        s.name AS standard_name
      FROM gap_analyses ga
      LEFT JOIN tenants t ON ga.tenant_id = t.id
      LEFT JOIN standards s ON ga.standard_id = s.id
      WHERE ga.tenant_id = $1
        AND ga.revision = $2
      ORDER BY ga.created_date DESC
      LIMIT 1
    `, [tenantId, revNum]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'GAP analysis not found'
      });
    }

    const row = result.rows[0];

    // Get detailed results if stored in metadata or results field
    let detailedResults = {};
    if (row.metadata && row.metadata.results) {
      detailedResults = row.metadata.results;
    } else if (row.results) {
      detailedResults = typeof row.results === 'string' ? JSON.parse(row.results) : row.results;
    }

    res.json({
      success: true,
      gapAnalysis: {
        id: row.id,
        referenceNumber: row.reference_number,
        revision: row.revision,
        tenantId: row.tenant_id,
        customerName: row.customer_name,
        customerKey: row.customer_key,
        standardId: row.standard_id,
        standardCode: row.standard_code,
        standardName: row.standard_name,
        totalRequirements: row.total_requirements,
        coveredRequirements: row.covered_requirements,
        gapCount: row.gap_count,
        gapPercentage: row.gap_percentage,
        status: row.status,
        createdDate: row.created_date,
        analyzedAt: row.analyzed_at,
        exportedAt: row.exported_at,
        notes: row.notes,
        metadata: row.metadata || {},
        detailedResults
      }
    });
  } catch (error) {
    console.error('[customerArchive] Error fetching GAP analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/customer-archive/gap-analyses
 * Create new GAP analysis with reference number and revision
 */
router.post('/gap-analyses', async (req, res) => {
  try {
    const {
      tenantId,
      standardId,
      standardCode,
      customerId, // Can be tenant ID or key
      notes
    } = req.body;

    if (!tenantId && !customerId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId or customerId is required'
      });
    }

    // Get tenant ID if customerId (key or name) was provided
    let finalTenantId = tenantId;
    if (!finalTenantId && customerId) {
      // Try to find tenant by UUID, key, or name
      const isUuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
      
      let tenantResult;
      if (isUuidPattern) {
        tenantResult = await queryPostgres(`
          SELECT id FROM tenants WHERE id = $1::uuid LIMIT 1
        `, [customerId]);
        
        if (tenantResult.rows.length === 0) {
          tenantResult = await queryPostgres(`
            SELECT id FROM tenants WHERE key = $1 OR name = $1 OR LOWER(key) = LOWER($1) OR LOWER(name) = LOWER($1) LIMIT 1
          `, [customerId]);
        }
      } else {
        tenantResult = await queryPostgres(`
          SELECT id FROM tenants WHERE key = $1 OR name = $1 OR LOWER(key) = LOWER($1) OR LOWER(name) = LOWER($1) LIMIT 1
        `, [customerId]);
      }
      
      if (tenantResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }
      finalTenantId = tenantResult.rows[0].id;
    }

    // Get standard ID if only code provided - improved resolution
    let finalStandardId = standardId;
    let finalStandardCode = standardCode;
    
    if (!finalStandardId && standardCode) {
      // Try multiple matching strategies for standard code
      const stdResult = await queryPostgres(`
        SELECT id, code, name
        FROM standards 
        WHERE code = $1 
           OR UPPER(code) = UPPER($1)
           OR name ILIKE '%' || $1 || '%'
        LIMIT 1
      `, [standardCode]);
      
      if (stdResult.rows.length === 0) {
        console.error(`[customerArchive] Standard not found for code: ${standardCode}`);
        // Log available standards for debugging
        const availableStandards = await queryPostgres(`
          SELECT code, name FROM standards LIMIT 10
        `);
        console.error(`[customerArchive] Available standards:`, availableStandards.rows);
        
        return res.status(400).json({
          success: false,
          error: `Standard not found for code: ${standardCode}. Please ensure the standard is uploaded and parsed first.`
        });
      }
      finalStandardId = stdResult.rows[0].id;
      finalStandardCode = stdResult.rows[0].code;
    } else if (finalStandardId && !finalStandardCode) {
      // If we have standardId but no code, fetch the code
      const stdResult = await queryPostgres(`
        SELECT code FROM standards WHERE id = $1::uuid LIMIT 1
      `, [finalStandardId]);
      
      if (stdResult.rows.length === 0) {
        console.error(`[customerArchive] Standard not found for ID: ${finalStandardId}`);
        return res.status(400).json({
          success: false,
          error: `Standard not found for ID: ${finalStandardId}`
        });
      }
      finalStandardCode = stdResult.rows[0].code;
    }

    if (!finalStandardId) {
      return res.status(400).json({
        success: false,
        error: 'standardId or standardCode is required'
      });
    }
    
    // Validate that the standard actually exists
    const stdValidation = await queryPostgres(`
      SELECT id, code, name FROM standards WHERE id = $1::uuid LIMIT 1
    `, [finalStandardId]);
    
    if (stdValidation.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Standard not found: ${finalStandardId}`
      });
    }

    // Generate reference number
    const refNumberResult = await queryPostgres(`
      SELECT generate_gap_reference_number($1::uuid, $2::varchar) AS ref_number
    `, [finalTenantId, finalStandardCode || 'UNKNOWN']);

    const referenceNumber = refNumberResult.rows[0].ref_number;

    // Get next revision number
    const revResult = await queryPostgres(`
      SELECT get_next_revision_number($1::uuid, $2::uuid) AS next_revision
    `, [finalTenantId, finalStandardId]);

    const revision = revResult.rows[0].next_revision;

    // Create GAP analysis record
    const gapId = uuidv4();
    const insertResult = await queryPostgres(`
      INSERT INTO gap_analyses (
        id,
        tenant_id,
        standard_id,
        standard_code,
        reference_number,
        revision,
        created_date,
        analyzed_at,
        status,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), 'pending', $7)
      RETURNING id, reference_number, revision, created_date
    `, [
      gapId,
      finalTenantId,
      finalStandardId,
      standardCode || null,
      referenceNumber,
      revision,
      notes || null
    ]);

    res.status(201).json({
      success: true,
      message: 'GAP analysis created successfully',
      gapAnalysis: {
        id: insertResult.rows[0].id,
        referenceNumber: insertResult.rows[0].reference_number,
        revision: insertResult.rows[0].revision,
        createdDate: insertResult.rows[0].created_date,
        tenantId: finalTenantId,
        standardId: finalStandardId
      }
    });
  } catch (error) {
    console.error('[customerArchive] Error creating GAP analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/customer-archive/gap-analyses/:gapId/export
 * Export GAP analysis results to PDF/Word format
 */
router.post('/gap-analyses/:gapId/export', async (req, res) => {
  try {
    const { gapId } = req.params;
    const { format = 'pdf' } = req.body; // 'pdf' or 'word'

    // Get GAP analysis with full details
    const result = await queryPostgres(`
      SELECT 
        ga.*,
        t.name AS customer_name,
        t.key AS customer_key,
        t.contact_email,
        t.contact_persons,
        s.code AS standard_code,
        s.name AS standard_name
      FROM gap_analyses ga
      LEFT JOIN tenants t ON ga.tenant_id = t.id
      LEFT JOIN standards s ON ga.standard_id = s.id
      WHERE ga.id = $1::uuid
    `, [gapId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'GAP analysis not found'
      });
    }

    const gapAnalysis = result.rows[0];

    // Get detailed results
    let detailedResults = {};
    if (gapAnalysis.metadata && gapAnalysis.metadata.results) {
      detailedResults = gapAnalysis.metadata.results;
    } else if (gapAnalysis.results) {
      detailedResults = typeof gapAnalysis.results === 'string' 
        ? JSON.parse(gapAnalysis.results) 
        : gapAnalysis.results;
    }

    // For now, return JSON structure that can be formatted by frontend
    // TODO: Implement actual PDF/Word generation with libraries like pdfkit or docx
    const exportData = {
      customer: {
        name: gapAnalysis.customer_name,
        key: gapAnalysis.customer_key,
        contactEmail: gapAnalysis.contact_email,
        contactPersons: gapAnalysis.contact_persons || []
      },
      standard: {
        code: gapAnalysis.standard_code,
        name: gapAnalysis.standard_name
      },
      gapAnalysis: {
        referenceNumber: gapAnalysis.reference_number,
        revision: gapAnalysis.revision,
        createdDate: gapAnalysis.created_date,
        analyzedAt: gapAnalysis.analyzed_at,
        totalRequirements: gapAnalysis.total_requirements,
        coveredRequirements: gapAnalysis.covered_requirements,
        gapCount: gapAnalysis.gap_count,
        gapPercentage: gapAnalysis.gap_percentage,
        status: gapAnalysis.status,
        notes: gapAnalysis.notes
      },
      detailedResults
    };

    // Update exported_at timestamp
    await queryPostgres(`
      UPDATE gap_analyses
      SET exported_at = NOW()
      WHERE id = $1::uuid
    `, [gapId]);

    res.json({
      success: true,
      format,
      exportData,
      message: 'GAP analysis exported successfully. Export to ' + format + ' format (formatting to be implemented).'
    });
  } catch (error) {
    console.error('[customerArchive] Error exporting GAP analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

