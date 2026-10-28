/**
 * Authentication Routes
 */

import express from 'express';
import { login, getCurrentUser } from './authService.js';
import { authenticate } from './authMiddleware.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side token removal)
 */
router.post('/logout', authenticate, async (req, res) => {
  res.json({ message: 'Logged out' });
});

/**
 * GET /api/auth/me
 * Get current user
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await getCurrentUser(req.user.userId);
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

export default router;
