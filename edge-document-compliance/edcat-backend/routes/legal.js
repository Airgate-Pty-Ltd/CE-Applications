import express from 'express';
import { query } from '../database/connection.js';

const router = express.Router();

const defaultPages = [
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    content: '<p>EDCAT respects your privacy. This placeholder policy can be updated in production.</p>'
  },
  {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    content: '<p>Use of EDCAT is subject to these placeholder terms.</p>'
  }
];

router.get('/', async (_req, res) => {
  try {
    const pages = await query('SELECT slug, title, published_at FROM legal_pages ORDER BY title ASC');
    if (pages.rows.length === 0) {
      return res.json({ success: true, pages: defaultPages.map(({ slug, title }) => ({ slug, title })) });
    }
    res.json({ success: true, pages: pages.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const result = await query('SELECT * FROM legal_pages WHERE slug = $1', [req.params.slug]);
    if (!result.rows.length) {
      const fallback = defaultPages.find((page) => page.slug === req.params.slug);
      if (fallback) {
        return res.json({ success: true, page: fallback });
      }
      return res.status(404).json({ success: false, error: 'Page not found' });
    }
    res.json({ success: true, page: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
