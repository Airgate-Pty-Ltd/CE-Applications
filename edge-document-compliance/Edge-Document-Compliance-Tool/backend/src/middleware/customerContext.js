/**
 * Customer Context Middleware
 * Extracts customer ID from request and adds customer schema info to req.customer
 */

import { query } from '../database/connection.js';

/**
 * Middleware to extract customer context from request
 * Looks for customerId in:
 * 1. req.headers['x-customer-id']
 * 2. req.query.customerId
 * 3. req.body.customerId
 */
export async function customerContext(req, res, next) {
  try {
    // Extract customer ID from various sources
    const customerId = 
      req.headers['x-customer-id'] || 
      req.query.customerId || 
      req.body?.customerId;

    // Normalize: remove empty strings, null, undefined
    const normalizedCustomerId = customerId && String(customerId).trim() ? String(customerId).trim() : null;

    if (!normalizedCustomerId) {
      // If no customer ID provided, continue without customer context
      // Some routes may work without customer context (e.g., standards uploads, general queries)
      req.customer = null;
      return next();
    }

    // Look up customer schema
    try {
      const result = await query(
        `SELECT customer_id, customer_name, schema_name, status
         FROM public.customers
         WHERE customer_id = $1 AND status = 'active'`,
        [normalizedCustomerId]
      );

      if (result.rows.length === 0) {
        // Customer not found, but don't block the request - let the route decide
        console.log(`⚠️ Customer '${normalizedCustomerId}' not found or inactive, continuing without customer context`);
        req.customer = null;
        return next();
      }

      const customer = result.rows[0];
      req.customer = {
        id: customer.customer_id,
        name: customer.customer_name,
        schemaName: customer.schema_name
      };

      next();
    } catch (dbError) {
      // Database error - don't block the request, just log and continue without customer context
      console.error('Database error in customerContext middleware:', dbError.message);
      console.log('Continuing without customer context');
      req.customer = null;
      return next();
    }
  } catch (error) {
    // Unexpected error - log but don't block
    console.error('Unexpected error in customerContext middleware:', error);
    req.customer = null;
    return next();
  }
}

/**
 * Middleware that requires customer context
 * Returns 400 if no customer context is available
 */
export function requireCustomer(req, res, next) {
  if (!req.customer) {
    return res.status(400).json({
      success: false,
      error: 'Customer context required. Provide customerId in header (X-Customer-Id), query param, or body.'
    });
  }
  next();
}

