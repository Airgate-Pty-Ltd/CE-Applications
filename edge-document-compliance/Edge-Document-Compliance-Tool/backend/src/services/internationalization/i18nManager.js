/**
 * Internationalization (i18n) Manager
 * Handles translations and regional compliance mappings
 */

import { query } from '../../database/connection.js';

class I18nManager {
  constructor() {
    this.cache = new Map();
    this.defaultLanguage = 'en';
    this.supportedLanguages = ['en', 'es', 'fr', 'de', 'zh-CN', 'ja', 'pt', 'ru'];
  }

  async getTranslation(key, languageCode = 'en', namespace = 'default') {
    const cacheKey = `${namespace}:${key}:${languageCode}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Try requested language first
      let result = await query(
        `SELECT translated_text FROM i18n_translations
         WHERE translation_key = $1 AND language_code = $2 AND namespace = $3`,
        [key, languageCode, namespace]
      );

      // Fallback to default language if not found
      if (result.rows.length === 0 && languageCode !== this.defaultLanguage) {
        result = await query(
          `SELECT translated_text FROM i18n_translations
           WHERE translation_key = $1 AND language_code = $2 AND namespace = $3`,
          [key, this.defaultLanguage, namespace]
        );
      }

      // Fallback to key itself if still not found
      const translation = result.rows.length > 0 
        ? result.rows[0].translated_text 
        : key;

      this.cache.set(cacheKey, translation);
      return translation;
    } catch (error) {
      console.error('[I18nManager] Error getting translation:', error);
      return key; // Return key as fallback
    }
  }

  async getTranslations(namespace, languageCode = 'en') {
    try {
      const result = await query(
        `SELECT translation_key, translated_text 
         FROM i18n_translations
         WHERE namespace = $1 AND language_code = $2`,
        [namespace, languageCode]
      );

      const translations = {};
      for (const row of result.rows) {
        translations[row.translation_key] = row.translated_text;
      }

      return translations;
    } catch (error) {
      console.error('[I18nManager] Error getting translations:', error);
      return {};
    }
  }

  async setTranslation(key, languageCode, translatedText, namespace = 'default', context = null) {
    try {
      await query(
        `INSERT INTO i18n_translations 
         (translation_key, language_code, namespace, translated_text, context)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (translation_key, language_code, namespace)
         DO UPDATE SET 
           translated_text = EXCLUDED.translated_text,
           context = EXCLUDED.context,
           updated_at = NOW()`,
        [key, languageCode, namespace, translatedText, context]
      );

      // Clear cache
      const cacheKey = `${namespace}:${key}:${languageCode}`;
      this.cache.delete(cacheKey);

      return { success: true };
    } catch (error) {
      console.error('[I18nManager] Error setting translation:', error);
      throw error;
    }
  }

  async getRegionalComplianceMapping(sourceStandard, targetRegion) {
    try {
      const result = await query(
        `SELECT target_standard_code, mapping_type, confidence_score, notes
         FROM regional_compliance_mappings
         WHERE source_standard_code = $1 AND region_code = $2
         ORDER BY confidence_score DESC`,
        [sourceStandard, targetRegion]
      );

      return result.rows.map(row => ({
        targetStandard: row.target_standard_code,
        mappingType: row.mapping_type,
        confidence: parseFloat(row.confidence_score),
        notes: row.notes
      }));
    } catch (error) {
      console.error('[I18nManager] Error getting regional mapping:', error);
      return [];
    }
  }

  async setRegionalMapping(sourceStandard, targetStandard, regionCode, mappingType, confidenceScore, notes = null) {
    try {
      await query(
        `INSERT INTO regional_compliance_mappings
         (source_standard_code, target_standard_code, region_code, mapping_type, confidence_score, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (source_standard_code, target_standard_code, region_code)
         DO UPDATE SET
           mapping_type = EXCLUDED.mapping_type,
           confidence_score = EXCLUDED.confidence_score,
           notes = EXCLUDED.notes`,
        [sourceStandard, targetStandard, regionCode, mappingType, confidenceScore, notes]
      );

      return { success: true };
    } catch (error) {
      console.error('[I18nManager] Error setting regional mapping:', error);
      throw error;
    }
  }

  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  clearCache() {
    this.cache.clear();
  }
}

export default I18nManager;

