// EDCAT REQUIREMENTS MODEL:
// - Requirement packs are atomic abstractions of a specific regulation, part, or standard.
// - Profiles compose these packs to build a tenant scope. Never hard-code mixed assumptions.
// - Live requirement text and parsing is delegated to backend services that fetch authoritative sources.

const RequirementsConfig = (function () {
  const requirementPacks = {
    // --- Aerospace / Quality Standards ---
    STANDARD_AS9100: {
      id: 'STANDARD_AS9100',
      label: 'AS9100D Requirements',
      type: 'standard',
      sector: 'aerospace',
      authority: 'SAE / IAQG',
      reference_urls: ['https://www.sae.org/standards/content/as9100d/'],
      notes: 'Quality management system requirements for aviation, space, and defense organizations.'
    },
    STANDARD_AS9110: {
      id: 'STANDARD_AS9110',
      label: 'AS9110C Requirements',
      type: 'standard',
      sector: 'aerospace',
      authority: 'SAE / IAQG',
      reference_urls: ['https://www.sae.org/standards/content/as9110c/'],
      notes: 'Maintenance organizations quality management standard aligned to AS9100.'
    },
    STANDARD_AS9120: {
      id: 'STANDARD_AS9120',
      label: 'AS9120B Requirements',
      type: 'standard',
      sector: 'aerospace',
      authority: 'SAE / IAQG',
      reference_urls: ['https://www.sae.org/standards/content/as9120b/'],
      notes: 'Quality management for stockist distributors in aerospace.'
    },
    STANDARD_ISO_9001: {
      id: 'STANDARD_ISO_9001',
      label: 'ISO 9001:2015 Requirements',
      type: 'standard',
      sector: 'quality',
      authority: 'ISO',
      reference_urls: ['https://www.iso.org/iso-9001-quality-management.html'],
      notes: 'Widely adopted quality management system requirements.'
    },
    STANDARD_ISO_13485: {
      id: 'STANDARD_ISO_13485',
      label: 'ISO 13485:2016 Requirements',
      type: 'standard',
      sector: 'medical',
      authority: 'ISO',
      reference_urls: ['https://www.iso.org/standard/59752.html'],
      notes: 'Medical devices quality management system requirements.'
    },

    // --- Aerospace Regulators (Atomic Part 21 / Part 145 splits) ---
    REGPACK_FAA_PART21: {
      id: 'REGPACK_FAA_PART21',
      label: 'FAA 14 CFR Part 21 – Certification & Production (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'FAA',
      reference_urls: [
        'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-21',
        'https://www.faa.gov'
      ],
      notes: 'For PAH, PC, PMA, TSO, STC, and production/system requirements.'
    },
    REGPACK_FAA_PART145: {
      id: 'REGPACK_FAA_PART145',
      label: 'FAA 14 CFR Part 145 – Repair Stations (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'FAA',
      reference_urls: [
        'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-145',
        'https://www.faa.gov'
      ],
      notes: 'For certificated repair stations and maintenance organizations.'
    },
    REGPACK_EASA_PART21: {
      id: 'REGPACK_EASA_PART21',
      label: 'EASA Part-21 – Design & Production (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'EASA',
      reference_urls: ['https://www.easa.europa.eu'],
      notes: 'Covers DOA/POA and related obligations.'
    },
    REGPACK_EASA_PART145: {
      id: 'REGPACK_EASA_PART145',
      label: 'EASA Part-145 – Maintenance Organisations (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'EASA',
      reference_urls: ['https://www.easa.europa.eu'],
      notes: 'Maintenance and MRO requirements for EASA approvals.'
    },
    REGPACK_UKCAA_PART21: {
      id: 'REGPACK_UKCAA_PART21',
      label: 'UK CAA Part-21 – Design & Production (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'UK CAA',
      reference_urls: ['https://www.caa.co.uk'],
      notes: 'Post-Brexit implementation for UK design and production approvals.'
    },
    REGPACK_UKCAA_PART145: {
      id: 'REGPACK_UKCAA_PART145',
      label: 'UK CAA Part-145 – Maintenance Organisations (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'UK CAA',
      reference_urls: ['https://www.caa.co.uk'],
      notes: 'Maintenance organisation approval requirements.'
    },
    REGPACK_CASA_PART21: {
      id: 'REGPACK_CASA_PART21',
      label: 'CASA CASR Part 21 – Certification & Production (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'CASA',
      reference_urls: ['https://www.casa.gov.au'],
      notes: 'CASA production and design approvals under Australian CASR.'
    },
    REGPACK_CASA_PART145: {
      id: 'REGPACK_CASA_PART145',
      label: 'CASA Part 145 – Approved Maintenance Organisations (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'CASA',
      reference_urls: ['https://www.casa.gov.au'],
      notes: 'Maintenance organisation approval requirements.'
    },
    REGPACK_TCCA_PART21: {
      id: 'REGPACK_TCCA_PART21',
      label: 'TCCA Part 21 / CAR 521 – Design & Manufacturing Approvals (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'Transport Canada',
      reference_urls: ['https://tc.canada.ca/en/aviation'],
      notes: 'Transport Canada Civil Aviation design, type, and manufacturing approvals.'
    },
    REGPACK_TCCA_AMO: {
      id: 'REGPACK_TCCA_AMO',
      label: 'TCCA AMO / CAR 573 – Approved Maintenance Organisations (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'Transport Canada',
      reference_urls: ['https://tc.canada.ca/en/aviation'],
      notes: 'Requirements for Canadian Approved Maintenance Organisations.'
    },
    REGPACK_ANAC_RBAC21: {
      id: 'REGPACK_ANAC_RBAC21',
      label: 'ANAC RBAC 21 – Certification Procedures (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'ANAC Brazil',
      reference_urls: ['https://www.gov.br/anac/pt-br'],
      notes: 'Brazilian design and production approvals (RBAC 21).'
    },
    REGPACK_ANAC_RBAC145: {
      id: 'REGPACK_ANAC_RBAC145',
      label: 'ANAC RBAC 145 – Maintenance Organisations (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'ANAC Brazil',
      reference_urls: ['https://www.gov.br/anac/pt-br'],
      notes: 'Brazilian maintenance and repair organisation requirements.'
    },
    REGPACK_CAAC_CCAR21: {
      id: 'REGPACK_CAAC_CCAR21',
      label: 'CAAC CCAR-21 – Certification of Products and Parts (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'CAAC China',
      reference_urls: ['https://www.caac.gov.cn'],
      notes: 'Chinese certification and production requirements for civil aviation products.'
    },
    REGPACK_CAAC_CCAR145: {
      id: 'REGPACK_CAAC_CCAR145',
      label: 'CAAC CCAR-145 – Maintenance Organisations (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'CAAC China',
      reference_urls: ['https://www.caac.gov.cn'],
      notes: 'Chinese requirements for maintenance and repair organisations.'
    },
    REGPACK_DGCA_CAR21: {
      id: 'REGPACK_DGCA_CAR21',
      label: 'DGCA India CAR-21 – Certification (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'DGCA India',
      reference_urls: ['https://dgca.gov.in'],
      notes: 'Indian Civil Aviation Requirements for certification and production.'
    },
    REGPACK_DGCA_MRO: {
      id: 'REGPACK_DGCA_MRO',
      label: 'DGCA India CAR MRO – Maintenance Organisations (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'DGCA India',
      reference_urls: ['https://dgca.gov.in'],
      notes: 'Indian maintenance organisation approval framework.'
    },
    REGPACK_GCAA_CAR21: {
      id: 'REGPACK_GCAA_CAR21',
      label: 'GCAA UAE CAR 21 – Certification & Production (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'GCAA UAE',
      reference_urls: ['https://www.gcaa.gov.ae'],
      notes: 'United Arab Emirates certification and production requirements.'
    },
    REGPACK_GCAA_CAR145: {
      id: 'REGPACK_GCAA_CAR145',
      label: 'GCAA UAE CAR 145 – Maintenance Organisations (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'GCAA UAE',
      reference_urls: ['https://www.gcaa.gov.ae'],
      notes: 'United Arab Emirates maintenance organisation approvals.'
    },
    REGPACK_CAAS_ANR21: {
      id: 'REGPACK_CAAS_ANR21',
      label: 'CAAS Singapore ANR-21 – Certification (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'CAAS Singapore',
      reference_urls: ['https://www.caas.gov.sg'],
      notes: 'Singapore Air Navigation Regulations Part 21 equivalent requirements.'
    },
    REGPACK_CAAS_ANR145: {
      id: 'REGPACK_CAAS_ANR145',
      label: 'CAAS Singapore ANR-145 – Maintenance Organisations (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'CAAS Singapore',
      reference_urls: ['https://www.caas.gov.sg'],
      notes: 'Singapore maintenance organisation approval requirements.'
    },
    REGPACK_CAANZ_PART21: {
      id: 'REGPACK_CAANZ_PART21',
      label: 'CAA New Zealand Part 21 – Certification of Products & Parts (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'CAA New Zealand',
      reference_urls: ['https://www.aviation.govt.nz'],
      notes: 'New Zealand certification and production requirements.'
    },
    REGPACK_CAANZ_PART145: {
      id: 'REGPACK_CAANZ_PART145',
      label: 'CAA New Zealand Part 145 – Maintenance Organisations (Abstracted)',
      type: 'regulation',
      sector: 'aerospace',
      authority: 'CAA New Zealand',
      reference_urls: ['https://www.aviation.govt.nz'],
      notes: 'New Zealand maintenance organisation approval requirements.'
    },

    // --- Medical Device Regulators ---
    REGPACK_FDA_21CFR820: {
      id: 'REGPACK_FDA_21CFR820',
      label: 'FDA 21 CFR 820 – Quality System Regulation (Abstracted)',
      type: 'regulation',
      sector: 'medical',
      authority: 'FDA',
      reference_urls: [
        'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-H/part-820',
        'https://www.fda.gov'
      ],
      notes: 'US FDA quality system requirements for medical device manufacturers.'
    },
    REGPACK_EU_MDR: {
      id: 'REGPACK_EU_MDR',
      label: 'EU Medical Device Regulation (EU MDR) (Abstracted)',
      type: 'regulation',
      sector: 'medical',
      authority: 'European Union',
      reference_urls: ['https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32017R0745'],
      notes: 'European Union MDR requirements for medical devices.'
    },
    REGPACK_MDSAP: {
      id: 'REGPACK_MDSAP',
      label: 'Medical Device Single Audit Program (MDSAP) (Abstracted)',
      type: 'regulation',
      sector: 'medical',
      authority: 'IMDRF / Participating Regulators',
      reference_urls: [
        'https://www.fda.gov/medical-devices/cdrh-international-affairs/medical-device-single-audit-program-mdsap',
        'https://www.imdrf.org/working-groups/medical-device-single-audit-program-mdsap'
      ],
      notes:
        'Framework aligning ISO 13485 with requirements from FDA, TGA, Health Canada, PMDA/MHLW, and ANVISA. Used as an overlay pack.'
    },

    // --- Automotive Regulators ---
    REGPACK_NHTSA_FMVSS: {
      id: 'REGPACK_NHTSA_FMVSS',
      label: 'NHTSA Federal Motor Vehicle Safety Standards (Abstracted)',
      type: 'regulation',
      sector: 'automotive',
      authority: 'NHTSA',
      reference_urls: ['https://www.nhtsa.gov/laws-regulations/fmvss'],
      notes: 'US Federal Motor Vehicle Safety Standards. Can be further split by FMVSS group if required.'
    },
    REGPACK_UNECE_WP29: {
      id: 'REGPACK_UNECE_WP29',
      label: 'UNECE WP.29 Vehicle Regulations (Abstracted)',
      type: 'regulation',
      sector: 'automotive',
      authority: 'UNECE',
      reference_urls: ['https://unece.org/transport/vehicle-regulations'],
      notes: 'Global technical regulations for automotive compliance. Can be split into individual UN regulations as needed.'
    }
  };

  function getPack(id) {
    return requirementPacks[id] || null;
  }

  function getPacks(ids = []) {
    if (!Array.isArray(ids)) return [];
    return ids.map((id) => getPack(id)).filter(Boolean);
  }

  function listPacks() {
    return Object.values(requirementPacks);
  }

  function getPacksForProfile(profileId) {
    if (!profileId) return [];
    if (typeof window !== 'undefined' && window.ProfilesConfig) {
      const profile = window.ProfilesConfig.getProfile(profileId);
      if (profile) {
        const packIds = [
          ...(profile.enabled_standards || []),
          ...(profile.enabled_reg_packs || [])
        ];
        return getPacks(packIds);
      }
    }
    return [];
  }

  return {
    getPack,
    getPacks,
    getPacksForProfile,
    listPacks
  };
})();

if (typeof window !== 'undefined') {
  window.RequirementsConfig = RequirementsConfig;
}

