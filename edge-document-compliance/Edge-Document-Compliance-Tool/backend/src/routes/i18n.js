/**
 * Internationalization (i18n) Routes
 */

import express from 'express';
import I18nManager from '../services/internationalization/i18nManager.js';

const router = express.Router();
const i18n = new I18nManager();

/**
 * GET /api/i18n/content/:key
 * Get translation for a key
 */
router.get('/content/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { lang = 'en', namespace = 'default' } = req.query;

    const translation = await i18n.getTranslation(key, lang, namespace);
    res.json({
      success: true,
      key: key,
      language: lang,
      namespace: namespace,
      translation: translation
    });
  } catch (error) {
    console.error('[I18n] Error getting translation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/i18n/translations
 * Get all translations for a namespace
 */
router.get('/translations', async (req, res) => {
  try {
    const { lang = 'en', namespace = 'default' } = req.query;
    const translations = await i18n.getTranslations(namespace, lang);
    res.json({
      success: true,
      language: lang,
      namespace: namespace,
      translations: translations
    });
  } catch (error) {
    console.error('[I18n] Error getting translations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/i18n/translations
 * Set/update a translation
 */
router.post('/translations', async (req, res) => {
  try {
    const { key, languageCode, translatedText, namespace = 'default', context } = req.body;

    if (!key || !languageCode || !translatedText) {
      return res.status(400).json({
        success: false,
        error: 'key, languageCode, and translatedText are required'
      });
    }

    const result = await i18n.setTranslation(key, languageCode, translatedText, namespace, context);
    res.json(result);
  } catch (error) {
    console.error('[I18n] Error setting translation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/i18n/regional-compliance
 * Get regional compliance mappings
 */
router.get('/regional-compliance', async (req, res) => {
  try {
    const { sourceStandard, targetRegion } = req.query;

    if (!sourceStandard || !targetRegion) {
      return res.status(400).json({
        success: false,
        error: 'sourceStandard and targetRegion are required'
      });
    }

    const mappings = await i18n.getRegionalComplianceMapping(sourceStandard, targetRegion);
    res.json({
      success: true,
      sourceStandard: sourceStandard,
      targetRegion: targetRegion,
      mappings: mappings
    });
  } catch (error) {
    console.error('[I18n] Error getting regional mappings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/i18n/regional-compliance
 * Set regional compliance mapping
 */
router.post('/regional-compliance', async (req, res) => {
  try {
    const { sourceStandard, targetStandard, regionCode, mappingType, confidenceScore, notes } = req.body;

    if (!sourceStandard || !targetStandard || !regionCode || !mappingType) {
      return res.status(400).json({
        success: false,
        error: 'sourceStandard, targetStandard, regionCode, and mappingType are required'
      });
    }

    const result = await i18n.setRegionalMapping(
      sourceStandard, targetStandard, regionCode, mappingType, confidenceScore, notes
    );
    res.json(result);
  } catch (error) {
    console.error('[I18n] Error setting regional mapping:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/i18n/languages
 * Get supported languages
 */
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    languages: i18n.getSupportedLanguages(),
    defaultLanguage: i18n.defaultLanguage
  });
});

export default router;

