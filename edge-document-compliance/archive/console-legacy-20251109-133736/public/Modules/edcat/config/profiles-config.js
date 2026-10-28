// EDCAT PROFILES MODEL:
// - Profiles compose atomic requirement packs (standards + regulations) for a tenant scope.
// - Each profile lists explicit pack IDs. Never assume mixed regulation bundles.

const ProfilesConfig = (function () {
  const profiles = {
    // --- FAA ---
    PROFILE_REG_FAA_PART21: {
      profile_id: 'PROFILE_REG_FAA_PART21',
      label: 'Regulatory – FAA Part 21 (PAH/Production)',
      tenant_types_allowed: ['regulator', 'oem'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_FAA_PART21'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.faa.gov/regulations_policies']
    },
    PROFILE_REG_FAA_PART145: {
      profile_id: 'PROFILE_REG_FAA_PART145',
      label: 'Regulatory – FAA Part 145 (Repair Stations)',
      tenant_types_allowed: ['regulator', 'mro'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_FAA_PART145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.faa.gov/regulations_policies']
    },
    PROFILE_REG_FAA_21_145_COMBINED: {
      profile_id: 'PROFILE_REG_FAA_21_145_COMBINED',
      label: 'Regulatory – FAA Part 21 + 145 Oversight',
      tenant_types_allowed: ['regulator'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_FAA_PART21', 'REGPACK_FAA_PART145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.faa.gov/regulations_policies']
    },

    // --- EASA ---
    PROFILE_REG_EASA_PART21: {
      profile_id: 'PROFILE_REG_EASA_PART21',
      label: 'Regulatory – EASA Part-21',
      tenant_types_allowed: ['regulator', 'oem'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_EASA_PART21'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.easa.europa.eu/en/regulations']
    },
    PROFILE_REG_EASA_PART145: {
      profile_id: 'PROFILE_REG_EASA_PART145',
      label: 'Regulatory – EASA Part-145',
      tenant_types_allowed: ['regulator', 'mro'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_EASA_PART145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.easa.europa.eu/en/regulations']
    },
    PROFILE_REG_EASA_21_145_COMBINED: {
      profile_id: 'PROFILE_REG_EASA_21_145_COMBINED',
      label: 'Regulatory – EASA Part-21 + 145 Oversight',
      tenant_types_allowed: ['regulator'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_EASA_PART21', 'REGPACK_EASA_PART145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.easa.europa.eu/en/regulations']
    },

    // --- UK CAA ---
    PROFILE_REG_UKCAA_PART21: {
      profile_id: 'PROFILE_REG_UKCAA_PART21',
      label: 'Regulatory – UK CAA Part-21',
      tenant_types_allowed: ['regulator', 'oem'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_UKCAA_PART21'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.caa.co.uk']
    },
    PROFILE_REG_UKCAA_PART145: {
      profile_id: 'PROFILE_REG_UKCAA_PART145',
      label: 'Regulatory – UK CAA Part-145',
      tenant_types_allowed: ['regulator', 'mro'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_UKCAA_PART145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.caa.co.uk']
    },
    PROFILE_REG_UKCAA_21_145_COMBINED: {
      profile_id: 'PROFILE_REG_UKCAA_21_145_COMBINED',
      label: 'Regulatory – UK CAA Part-21 + 145 Oversight',
      tenant_types_allowed: ['regulator'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_UKCAA_PART21', 'REGPACK_UKCAA_PART145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.caa.co.uk']
    },

    // --- CASA ---
    PROFILE_REG_CASA_PART21: {
      profile_id: 'PROFILE_REG_CASA_PART21',
      label: 'Regulatory – CASA Part 21',
      tenant_types_allowed: ['regulator', 'oem'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_CASA_PART21'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.casa.gov.au']
    },
    PROFILE_REG_CASA_PART145: {
      profile_id: 'PROFILE_REG_CASA_PART145',
      label: 'Regulatory – CASA Part 145',
      tenant_types_allowed: ['regulator', 'mro'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_CASA_PART145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.casa.gov.au']
    },
    PROFILE_REG_CASA_21_145_COMBINED: {
      profile_id: 'PROFILE_REG_CASA_21_145_COMBINED',
      label: 'Regulatory – CASA Part 21 + 145 Oversight',
      tenant_types_allowed: ['regulator'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_CASA_PART21', 'REGPACK_CASA_PART145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.casa.gov.au']
    },

    // --- Transport Canada ---
    PROFILE_REG_TCCA_PART21: {
      profile_id: 'PROFILE_REG_TCCA_PART21',
      label: 'Regulatory – TCCA CAR 521 (Part 21 equivalent)',
      tenant_types_allowed: ['regulator', 'oem'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_TCCA_PART21'],
      allow_customer_requirements: false,
      regulator_links: ['https://tc.canada.ca/en/aviation']
    },
    PROFILE_REG_TCCA_AMO: {
      profile_id: 'PROFILE_REG_TCCA_AMO',
      label: 'Regulatory – TCCA AMO / CAR 573',
      tenant_types_allowed: ['regulator', 'mro'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_TCCA_AMO'],
      allow_customer_requirements: false,
      regulator_links: ['https://tc.canada.ca/en/aviation']
    },
    PROFILE_REG_TCCA_COMBINED: {
      profile_id: 'PROFILE_REG_TCCA_COMBINED',
      label: 'Regulatory – TCCA CAR 521 + AMO Oversight',
      tenant_types_allowed: ['regulator'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_TCCA_PART21', 'REGPACK_TCCA_AMO'],
      allow_customer_requirements: false,
      regulator_links: ['https://tc.canada.ca/en/aviation']
    },

    // --- Brazil ANAC ---
    PROFILE_REG_ANAC_RBAC21: {
      profile_id: 'PROFILE_REG_ANAC_RBAC21',
      label: 'Regulatory – ANAC RBAC 21',
      tenant_types_allowed: ['regulator', 'oem'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_ANAC_RBAC21'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.gov.br/anac/pt-br']
    },
    PROFILE_REG_ANAC_RBAC145: {
      profile_id: 'PROFILE_REG_ANAC_RBAC145',
      label: 'Regulatory – ANAC RBAC 145',
      tenant_types_allowed: ['regulator', 'mro'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_ANAC_RBAC145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.gov.br/anac/pt-br']
    },
    PROFILE_REG_ANAC_COMBINED: {
      profile_id: 'PROFILE_REG_ANAC_COMBINED',
      label: 'Regulatory – ANAC RBAC 21 + 145 Oversight',
      tenant_types_allowed: ['regulator'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_ANAC_RBAC21', 'REGPACK_ANAC_RBAC145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.gov.br/anac/pt-br']
    },

    // --- CAAC China ---
    PROFILE_REG_CAAC_CCAR21: {
      profile_id: 'PROFILE_REG_CAAC_CCAR21',
      label: 'Regulatory – CAAC CCAR-21',
      tenant_types_allowed: ['regulator', 'oem'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_CAAC_CCAR21'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.caac.gov.cn']
    },
    PROFILE_REG_CAAC_CCAR145: {
      profile_id: 'PROFILE_REG_CAAC_CCAR145',
      label: 'Regulatory – CAAC CCAR-145',
      tenant_types_allowed: ['regulator', 'mro'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_CAAC_CCAR145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.caac.gov.cn']
    },
    PROFILE_REG_CAAC_COMBINED: {
      profile_id: 'PROFILE_REG_CAAC_COMBINED',
      label: 'Regulatory – CAAC CCAR-21 + 145 Oversight',
      tenant_types_allowed: ['regulator'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_CAAC_CCAR21', 'REGPACK_CAAC_CCAR145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.caac.gov.cn']
    },

    // --- DGCA India ---
    PROFILE_REG_DGCA_CAR21: {
      profile_id: 'PROFILE_REG_DGCA_CAR21',
      label: 'Regulatory – DGCA CAR-21',
      tenant_types_allowed: ['regulator', 'oem'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_DGCA_CAR21'],
      allow_customer_requirements: false,
      regulator_links: ['https://dgca.gov.in']
    },
    PROFILE_REG_DGCA_MRO: {
      profile_id: 'PROFILE_REG_DGCA_MRO',
      label: 'Regulatory – DGCA CAR MRO',
      tenant_types_allowed: ['regulator', 'mro'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_DGCA_MRO'],
      allow_customer_requirements: false,
      regulator_links: ['https://dgca.gov.in']
    },
    PROFILE_REG_DGCA_COMBINED: {
      profile_id: 'PROFILE_REG_DGCA_COMBINED',
      label: 'Regulatory – DGCA CAR-21 + MRO Oversight',
      tenant_types_allowed: ['regulator'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_DGCA_CAR21', 'REGPACK_DGCA_MRO'],
      allow_customer_requirements: false,
      regulator_links: ['https://dgca.gov.in']
    },

    // --- GCAA UAE ---
    PROFILE_REG_GCAA_CAR21: {
      profile_id: 'PROFILE_REG_GCAA_CAR21',
      label: 'Regulatory – GCAA CAR 21',
      tenant_types_allowed: ['regulator', 'oem'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_GCAA_CAR21'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.gcaa.gov.ae']
    },
    PROFILE_REG_GCAA_CAR145: {
      profile_id: 'PROFILE_REG_GCAA_CAR145',
      label: 'Regulatory – GCAA CAR 145',
      tenant_types_allowed: ['regulator', 'mro'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_GCAA_CAR145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.gcaa.gov.ae']
    },
    PROFILE_REG_GCAA_COMBINED: {
      profile_id: 'PROFILE_REG_GCAA_COMBINED',
      label: 'Regulatory – GCAA CAR 21 + 145 Oversight',
      tenant_types_allowed: ['regulator'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_GCAA_CAR21', 'REGPACK_GCAA_CAR145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.gcaa.gov.ae']
    },

    // --- CAAS Singapore ---
    PROFILE_REG_CAAS_ANR21: {
      profile_id: 'PROFILE_REG_CAAS_ANR21',
      label: 'Regulatory – CAAS ANR-21',
      tenant_types_allowed: ['regulator', 'oem'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_CAAS_ANR21'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.caas.gov.sg']
    },
    PROFILE_REG_CAAS_ANR145: {
      profile_id: 'PROFILE_REG_CAAS_ANR145',
      label: 'Regulatory – CAAS ANR-145',
      tenant_types_allowed: ['regulator', 'mro'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_CAAS_ANR145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.caas.gov.sg']
    },
    PROFILE_REG_CAAS_COMBINED: {
      profile_id: 'PROFILE_REG_CAAS_COMBINED',
      label: 'Regulatory – CAAS ANR-21 + 145 Oversight',
      tenant_types_allowed: ['regulator'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_CAAS_ANR21', 'REGPACK_CAAS_ANR145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.caas.gov.sg']
    },

    // --- CAA New Zealand ---
    PROFILE_REG_CAANZ_PART21: {
      profile_id: 'PROFILE_REG_CAANZ_PART21',
      label: 'Regulatory – CAA NZ Part 21',
      tenant_types_allowed: ['regulator', 'oem'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_CAANZ_PART21'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.aviation.govt.nz']
    },
    PROFILE_REG_CAANZ_PART145: {
      profile_id: 'PROFILE_REG_CAANZ_PART145',
      label: 'Regulatory – CAA NZ Part 145',
      tenant_types_allowed: ['regulator', 'mro'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_CAANZ_PART145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.aviation.govt.nz']
    },
    PROFILE_REG_CAANZ_COMBINED: {
      profile_id: 'PROFILE_REG_CAANZ_COMBINED',
      label: 'Regulatory – CAA NZ Part 21 + 145 Oversight',
      tenant_types_allowed: ['regulator'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_CAANZ_PART21', 'REGPACK_CAANZ_PART145'],
      allow_customer_requirements: false,
      regulator_links: ['https://www.aviation.govt.nz']
    },

    // --- Medical & Automotive composite profiles ---
    PROFILE_REG_MDSAP_AUDIT: {
      profile_id: 'PROFILE_REG_MDSAP_AUDIT',
      label: 'Regulatory – MDSAP Audit Program',
      tenant_types_allowed: ['cert_body', 'enterprise', 'consultant'],
      enabled_standards: ['STANDARD_ISO_13485'],
      enabled_reg_packs: ['REGPACK_MDSAP'],
      allow_customer_requirements: true,
      regulator_links: [
        'https://www.fda.gov/medical-devices/cdrh-international-affairs/medical-device-single-audit-program-mdsap'
      ]
    },
    PROFILE_MED_DEVICE_FDA: {
      profile_id: 'PROFILE_MED_DEVICE_FDA',
      label: 'Regulatory – FDA QSR (Medical Devices)',
      tenant_types_allowed: ['enterprise', 'consultant'],
      enabled_standards: ['STANDARD_ISO_13485'],
      enabled_reg_packs: ['REGPACK_FDA_21CFR820'],
      allow_customer_requirements: true,
      regulator_links: ['https://www.fda.gov']
    },
    PROFILE_MED_DEVICE_EU_MDR: {
      profile_id: 'PROFILE_MED_DEVICE_EU_MDR',
      label: 'Regulatory – EU MDR Manufacturers',
      tenant_types_allowed: ['enterprise', 'consultant'],
      enabled_standards: ['STANDARD_ISO_13485'],
      enabled_reg_packs: ['REGPACK_EU_MDR'],
      allow_customer_requirements: true,
      regulator_links: ['https://health.ec.europa.eu/medical-devices-sector_en']
    },
    PROFILE_AUTOMOTIVE_US_MANUFACTURER: {
      profile_id: 'PROFILE_AUTOMOTIVE_US_MANUFACTURER',
      label: 'Automotive – US FMVSS Compliance',
      tenant_types_allowed: ['enterprise', 'oem'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_NHTSA_FMVSS'],
      allow_customer_requirements: true,
      regulator_links: ['https://www.nhtsa.gov']
    },
    PROFILE_AUTOMOTIVE_GLOBAL: {
      profile_id: 'PROFILE_AUTOMOTIVE_GLOBAL',
      label: 'Automotive – UNECE Global Vehicle Regulations',
      tenant_types_allowed: ['enterprise', 'oem'],
      enabled_standards: [],
      enabled_reg_packs: ['REGPACK_UNECE_WP29'],
      allow_customer_requirements: true,
      regulator_links: ['https://unece.org/transport/vehicle-regulations']
    },

    // --- Certification Bodies & Enterprises (standards-focused mixes) ---
    PROFILE_CERT_BODY_AS_ISO: {
      profile_id: 'PROFILE_CERT_BODY_AS_ISO',
      label: 'Certification Body – Aerospace & ISO Standards',
      tenant_types_allowed: ['cert_body'],
      enabled_standards: [
        'STANDARD_ISO_9001',
        'STANDARD_AS9100',
        'STANDARD_AS9110',
        'STANDARD_AS9120',
        'STANDARD_ISO_13485'
      ],
      enabled_reg_packs: [],
      allow_customer_requirements: false,
      regulator_links: []
    },
    PROFILE_ENTERPRISE_AEROSPACE_OEM: {
      profile_id: 'PROFILE_ENTERPRISE_AEROSPACE_OEM',
      label: 'Enterprise – Aerospace OEM / Production',
      tenant_types_allowed: ['enterprise', 'oem', 'oem_mro'],
      enabled_standards: ['STANDARD_ISO_9001', 'STANDARD_AS9100'],
      enabled_reg_packs: ['REGPACK_FAA_PART21', 'REGPACK_EASA_PART21'],
      allow_customer_requirements: true,
      regulator_links: []
    },
    PROFILE_ENTERPRISE_AEROSPACE_MRO: {
      profile_id: 'PROFILE_ENTERPRISE_AEROSPACE_MRO',
      label: 'Enterprise – Aerospace MRO',
      tenant_types_allowed: ['enterprise', 'mro', 'oem_mro'],
      enabled_standards: ['STANDARD_ISO_9001', 'STANDARD_AS9110'],
      enabled_reg_packs: ['REGPACK_FAA_PART145', 'REGPACK_EASA_PART145'],
      allow_customer_requirements: true,
      regulator_links: []
    },
    PROFILE_ENTERPRISE_AEROSPACE_FULL: {
      profile_id: 'PROFILE_ENTERPRISE_AEROSPACE_FULL',
      label: 'Enterprise – Full Aerospace Compliance Stack',
      tenant_types_allowed: ['enterprise', 'oem', 'mro', 'oem_mro'],
      enabled_standards: [
        'STANDARD_ISO_9001',
        'STANDARD_AS9100',
        'STANDARD_AS9110',
        'STANDARD_AS9120'
      ],
      enabled_reg_packs: [
        'REGPACK_FAA_PART21',
        'REGPACK_FAA_PART145',
        'REGPACK_EASA_PART21',
        'REGPACK_EASA_PART145'
      ],
      allow_customer_requirements: true,
      regulator_links: []
    }
  };

  function getProfile(profileId) {
    return profiles[profileId] || null;
  }

  function getAllProfiles() {
    return Object.values(profiles);
  }

  function getProfilesForTenantType(tenantType) {
    return Object.values(profiles).filter((profile) =>
      Array.isArray(profile.tenant_types_allowed)
        ? profile.tenant_types_allowed.includes(tenantType)
        : true
    );
  }

  return {
    getProfile,
    getAllProfiles,
    getProfilesForTenantType
  };
})();

if (typeof window !== 'undefined') {
  window.ProfilesConfig = ProfilesConfig;
}

