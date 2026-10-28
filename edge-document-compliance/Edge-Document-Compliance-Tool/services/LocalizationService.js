const TRANSLATIONS = {
  'en-US': {
    compliance: 'Compliance',
    status: 'Status'
  },
  'de-DE': {
    compliance: 'Einhaltung',
    status: 'Status'
  },
  'fr-FR': {
    compliance: 'Conformité',
    status: 'Statut'
  }
};

class LocalizationService {
  async getLocalizedContent(resourceType, resourceId, language) {
    return {
      resourceType,
      resourceId,
      language,
      content: TRANSLATIONS[language] || TRANSLATIONS['en-US']
    };
  }

  async getRegionalVariant(framework, region) {
    return {
      framework,
      region,
      notes: 'Regional adjustments not yet configured.'
    };
  }
}

export default new LocalizationService();
