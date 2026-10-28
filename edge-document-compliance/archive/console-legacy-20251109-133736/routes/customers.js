const express = require('express');
const router = express.Router();
const { query } = require('../database/db');

// GET all customers
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json({ success: true, customers: result.rows });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET customer by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, customer: result.rows[0] });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST create new customer
router.post('/', async (req, res) => {
  try {
    const { company_name, contact_name, contact_email, contact_phone, industry } = req.body;

    if (!company_name) {
      return res.status(400).json({ success: false, error: 'Company name is required' });
    }

    const result = await query(
      `INSERT INTO customers (company_name, contact_name, contact_email, contact_phone, industry)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [company_name, contact_name, contact_email, contact_phone, industry]
    );

    res.json({ success: true, customer: result.rows[0] });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  try {
    const { company_name, contact_name, contact_email, contact_phone, industry } = req.body;

    const result = await query(
      `UPDATE customers
       SET company_name = COALESCE($1, company_name),
           contact_name = COALESCE($2, contact_name),
           contact_email = COALESCE($3, contact_email),
           contact_phone = COALESCE($4, contact_phone),
           industry = COALESCE($5, industry)
       WHERE id = $6
       RETURNING *`,
      [company_name, contact_name, contact_email, contact_phone, industry, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    res.json({ success: true, customer: result.rows[0] });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE customer
router.delete('/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM customers WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
