import express from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/index.js';

const router = express.Router();

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

router.get('/', async (_req, res) => {
  try {
    const users = await User.list();
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post(
  '/',
  validate([
    body('email').isEmail().withMessage('Valid email required'),
    body('full_name').isString().notEmpty().withMessage('full_name required'),
    body('role').isIn(['master_admin', 'admin', 'analyst', 'viewer']).withMessage('Invalid role'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  ]),
  async (req, res) => {
    try {
      const { email, full_name, role, password, status } = req.body;
      const existing = await User.findWithPasswordByEmail(email);
      if (existing) {
        return res.status(409).json({ success: false, error: 'User with this email already exists' });
      }
      const user = await User.create({ email, full_name, role, password, status });
      res.status(201).json({ success: true, user });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.patch(
  '/:id',
  validate([
    body('role').optional().isIn(['master_admin', 'admin', 'analyst', 'viewer']).withMessage('Invalid role'),
    body('status').optional().isIn(['active', 'suspended', 'disabled']).withMessage('Invalid status')
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.update(id, {
        full_name: req.body.full_name,
        role: req.body.role,
        status: req.body.status
      });
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post(
  '/:id/reset-password',
  validate([body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.setPassword(id, req.body.password);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const user = await User.update(req.params.id, { status: 'disabled' });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

