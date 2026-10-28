/**
 * Regulatory Requirements Routes
 * Manage regulatory requirement websites and files
 */

import express from 'express';
import { query, queryEdcatAI } from '../database/connection.js';

const router = express.Router();

// Regulatory websites are shared knowledge base resources, not customer-specific
// They are stored in EDCAT AI DB (regulatory_websites table)

/**
 * POST /api/regulatory/website
 * Add a regulatory website URL
 */
router.post('/website', async (req, res) => {
  try {
    const { url, name, description, agency } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    // Check if URL already exists (EDCAT AI DB: regulatory_websites)
    let existing;
    try {
      existing = await queryEdcatAI(
        `SELECT id FROM regulatory_websites WHERE url = $1`,
        [url]
      );
    } catch (dbError) {
      // If table doesn't exist, return graceful error
      if (dbError.code === '42P01' || dbError.message.includes('does not exist')) {
        return res.json({
          success: false,
          error: 'Table not created yet',
          message: 'The regulatory_websites table has not been created. Please run migrations first.'
        });
      }
      throw dbError;
    }

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        message: 'Website already exists',
        website: { id: existing.rows[0].id }
      });
    }

    // Insert new website into EDCAT AI DB (regulatory_websites)
    // Note: description column doesn't exist, use notes instead
    let result;
    try {
      result = await queryEdcatAI(
        `INSERT INTO regulatory_websites
         (url, name, regulatory_body, notes, added_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, url, name, regulatory_body, notes, added_at as created_at`,
        [
          url,
          name || null,
          agency || null,
          description || null  // Store description in notes field
        ]
      );
    } catch (dbError) {
      // If table doesn't exist, return graceful error
      if (dbError.code === '42P01' || dbError.message.includes('does not exist')) {
        return res.json({
          success: false,
          error: 'Table not created yet',
          message: 'The regulatory_websites table has not been created. Please run migrations first.'
        });
      }
      throw dbError;
    }

    res.json({
      success: true,
      message: 'Website added successfully',
      website: {
        id: result.rows[0].id,
        url: result.rows[0].url,
        name: result.rows[0].name,
        agency: result.rows[0].regulatory_body,
        description: result.rows[0].notes,  // Use notes field as description
        addedAt: result.rows[0].created_at
      }
    });
  } catch (error) {
    console.error('Error adding regulatory website:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/regulatory/websites
 * Get all saved regulatory websites
 */
router.get('/websites', async (req, res) => {
  try {
    // Fetch from EDCAT AI DB (regulatory_websites)
    // Handle case where table might not exist or connection fails
    let result;
    try {
      result = await queryEdcatAI(
        `SELECT id, url, name, regulatory_body as agency, notes as description, is_active, added_at
         FROM regulatory_websites
         WHERE is_active = TRUE
         ORDER BY added_at DESC`
      );
    } catch (dbError) {
      // If table doesn't exist or query fails, return empty array
      if (dbError.code === '42P01' || dbError.message.includes('does not exist')) {
        console.log('[regulatory] regulatory_websites table does not exist yet, returning empty array');
        return res.json({
          success: true,
          websites: []
        });
      }
      throw dbError;
    }

    res.json({
      success: true,
      count: result.rows.length,
      websites: result.rows.map(row => ({
        id: row.id,
        url: row.url,
        name: row.name,
        agency: row.agency,
        regulatory_body: row.agency, // Alias for compatibility
        addedAt: row.added_at,
        is_active: row.is_active
      }))
    });
  } catch (error) {
    console.error('Error fetching regulatory websites:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * DELETE /api/regulatory/website/:id
 * Delete a regulatory website
 */
router.delete('/website/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Delete from EDCAT AI DB (regulatory_websites)
    let result;
    try {
      result = await queryEdcatAI(
        `UPDATE regulatory_websites
         SET is_active = FALSE
         WHERE id = $1
         RETURNING id`,
        [id]
      );
    } catch (dbError) {
      // If table doesn't exist, return graceful error
      if (dbError.code === '42P01' || dbError.message.includes('does not exist')) {
        return res.json({
          success: false,
          error: 'Table not created yet',
          message: 'The regulatory_websites table has not been created. Please run migrations first.'
        });
      }
      throw dbError;
    }

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Website not found'
      });
    }

    res.json({
      success: true,
      message: 'Website deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting regulatory website:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

