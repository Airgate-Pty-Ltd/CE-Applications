import express from 'express';
import { query } from '../database/connection.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json({ success: true, customers: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { org_name, company_name, contact_name, contact_email, contact_phone, customer_type, industry } = req.body;
    const result = await query(
      `INSERT INTO customers (org_name, company_name, contact_name, contact_email, contact_phone, customer_type, industry)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [org_name, company_name || org_name, contact_name, contact_email, contact_phone, customer_type || 'operator', industry]
    );
    res.status(201).json({ success: true, customer: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, customer: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { org_name, company_name, contact_name, contact_email, contact_phone, customer_type, industry } = req.body;
    const result = await query(
      `UPDATE customers
       SET org_name = $1,
           company_name = $2,
           contact_name = $3,
           contact_email = $4,
           contact_phone = $5,
           customer_type = $6,
           industry = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [org_name, company_name || org_name, contact_name, contact_email, contact_phone, customer_type || 'operator', industry, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, customer: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

