import express from 'express';
import MarketplaceService from '../services/MarketplaceService.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const listings = await MarketplaceService.listListings();
    res.json({ success: true, listings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/install/:id', async (req, res) => {
  try {
    await MarketplaceService.installListing(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
