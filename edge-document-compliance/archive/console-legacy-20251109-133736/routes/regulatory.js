const express = require('express');
const router = express.Router();
const { getRegulatoryCatalog, ensureRegulationSets, fetchRegulation } = require('../services/regulationFetcher');

router.get('/options', (_req, res) => {
  try {
    const options = getRegulatoryCatalog();
    res.json({ success: true, options });
  } catch (error) {
    console.error('Error loading regulatory catalog:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/fetch', async (req, res) => {
  try {
    const { ids = [] } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ success: false, error: 'ids array is required' });
    }

    const sets = [];
    for (const id of ids) {
      const result = await fetchRegulation(id);
      sets.push({ requirement_set: result.requirementSet, source: result.source, requirements: result.requirementsCount, error: result.error });
    }

    res.json({ success: true, sets });
  } catch (error) {
    console.error('Error fetching regulations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const options = getRegulatoryCatalog();
    const ids = options.map((option) => option.id);
    const sets = await ensureRegulationSets(ids);

    res.json({
      success: true,
      sync: {
        count: sets.length,
        sources: sets.map((set) => ({ id: set.id, label: set.label })),
        updatedAt: new Date().toISOString()
      },
      message: 'Regulatory catalog synchronised'
    });
  } catch (error) {
    console.error('Error synchronising regulatory catalog:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
