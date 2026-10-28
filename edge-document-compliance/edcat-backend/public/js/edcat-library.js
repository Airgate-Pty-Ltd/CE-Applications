// ============================================================================
// APPROVAL TYPE DEFINITIONS BY SECTOR
// ============================================================================
const APPROVAL_TYPE_DEFINITIONS = {
  aerospace: {
    'Production': {
      description: 'Design & production approvals (TC, STC, PC, TSOA, POA/DOA equivalents).',
      regulations: ['14 CFR Part 21', 'EASA Part 21', 'CCAR-21', 'RBAC 21'],
      icon: '✈️'
    },
    'Repair': {
      description: 'Approvals for repair & alterations (STC use, Part 43/145 style frameworks).',
      regulations: ['14 CFR Part 43', '14 CFR Part 145', 'EASA Part-145'],
      icon: '🔧'
    },
    'Maintenance': {
      description: 'Maintenance organization & continuing airworthiness approvals.',
      regulations: ['14 CFR Part 145', 'EASA Part-145', 'Part-M/Part-CAMO'],
      icon: '⚙️'
    }
  },
  medical: {
    'Manufacturing': {
      description: 'Device manufacturing & QMS conformity.',
      regulations: ['ISO 13485', '21 CFR 820', 'MDR/IVDR', 'MDSAP Model'],
      icon: '🏭'
    },
    'Quality': {
      description: 'Systemic quality, risk management & PMS.',
      regulations: ['ISO 13485', 'ISO 14971'],
      icon: '✓'
    },
    'Clinical': {
      description: 'Clinical investigations & evaluations.',
      regulations: ['ISO 14155', 'MDR/IVDR clinical provisions'],
      icon: '🧪'
    }
  },
  automotive: {
    'Production': {
      description: 'Vehicle & component manufacturing QMS.',
      regulations: ['IATF 16949', 'UN/ECE & national type-approval rules'],
      icon: '🏭'
    },
    'Safety': {
      description: 'Safety performance & FMVSS/UNECE-based compliance.',
      regulations: ['FMVSS', 'UNECE Regulations', 'EU 2018/858'],
      icon: '🛡️'
    },
    'Emissions': {
      description: 'Emissions & environmental compliance.',
      regulations: ['EPA', 'CARB', 'EU emissions regs'],
      icon: '♻️'
    }
  },
  pharma: {
    'Manufacturing': {
      description: 'GMP for drug/biologic manufacturing.',
      regulations: ['21 CFR 210/211', 'EU GMP', 'PIC/S GMP'],
      icon: '⚗️'
    },
    'Quality': {
      description: 'Pharmaceutical quality systems & control.',
      regulations: ['ICH Q10', 'GMP Guides'],
      icon: '✓'
    },
    'Distribution': {
      description: 'GDP & distribution controls.',
      regulations: ['EU GDP', 'WHO GDP'],
      icon: '📦'
    }
  }
};

const REGULATORY_BODIES = [
  // Aerospace regulators
  {
    id: 'faa',
    name: 'Federal Aviation Administration (FAA)',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.faa.gov/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },
  {
    id: 'faa-part-21',
    name: 'FAA Part 21 – Certification Procedures for Products and Parts',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-21',
    type: 'Regulation',
    parentRegulator: 'faa',
    active: true
  },
  {
    id: 'faa-part-43',
    name: 'FAA Part 43 – Maintenance, Preventive Maintenance, Rebuilding, and Alteration',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-C/part-43',
    type: 'Regulation',
    parentRegulator: 'faa',
    active: true
  },
  {
    id: 'faa-part-65',
    name: 'FAA Part 65 – Certification: Airmen Other Than Flight Crewmembers',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.ecfr.gov/current/title-14/chapter-II/subchapter-D/part-65',
    type: 'Regulation',
    parentRegulator: 'faa',
    active: true
  },
  {
    id: 'faa-part-91',
    name: 'FAA Part 91 – General Operating and Flight Rules',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91',
    type: 'Regulation',
    parentRegulator: 'faa',
    active: true
  },
  {
    id: 'faa-part-121',
    name: 'FAA Part 121 – Operating Requirements: Domestic, Flag, and Supplemental Operations',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-121',
    type: 'Regulation',
    parentRegulator: 'faa',
    active: true
  },
  {
    id: 'faa-part-135',
    name: 'FAA Part 135 – Operating Requirements: Commuter and On Demand Operations',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-G/part-135',
    type: 'Regulation',
    parentRegulator: 'faa',
    active: true
  },
  {
    id: 'faa-part-145',
    name: 'FAA Part 145 – Repair Stations',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-H/part-145',
    type: 'Regulation',
    parentRegulator: 'faa',
    active: true
  },
  {
    id: 'faa-part-147',
    name: 'FAA Part 147 – Aviation Maintenance Technician Schools',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.ecfr.gov/current/title-14/chapter-II/subchapter-D/part-147',
    type: 'Regulation',
    parentRegulator: 'faa',
    active: true
  },
  {
    id: 'faa-part-183',
    name: 'FAA Part 183 – Representatives of the Administrator',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.ecfr.gov/current/title-14/chapter-I/subchapter-K/part-183',
    type: 'Regulation',
    parentRegulator: 'faa',
    active: true
  },
  {
    id: 'easa',
    name: 'European Union Aviation Safety Agency (EASA)',
    sector: ['Aerospace'],
    jurisdiction: 'European Union',
    website: 'https://www.easa.europa.eu/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },
  {
    id: 'easa-part-21',
    name: 'EASA Part 21 – Certification of Aircraft and Related Products, Parts and Appliances',
    sector: ['Aerospace'],
    jurisdiction: 'European Union',
    website: 'https://www.easa.europa.eu/en/regulations/part-21',
    type: 'Regulation',
    parentRegulator: 'easa',
    active: true
  },
  {
    id: 'easa-part-66',
    name: 'EASA Part 66 – Certifying Staff',
    sector: ['Aerospace'],
    jurisdiction: 'European Union',
    website: 'https://www.easa.europa.eu/en/regulations/part-66',
    type: 'Regulation',
    parentRegulator: 'easa',
    active: true
  },
  {
    id: 'easa-part-145',
    name: 'EASA Part 145 – Maintenance Organisations',
    sector: ['Aerospace'],
    jurisdiction: 'European Union',
    website: 'https://www.easa.europa.eu/en/regulations/part-145',
    type: 'Regulation',
    parentRegulator: 'easa',
    active: true
  },
  {
    id: 'easa-part-m',
    name: 'EASA Part M – Continuing Airworthiness',
    sector: ['Aerospace'],
    jurisdiction: 'European Union',
    website: 'https://www.easa.europa.eu/en/regulations/part-m',
    type: 'Regulation',
    parentRegulator: 'easa',
    active: true
  },
  {
    id: 'easa-part-147',
    name: 'EASA Part 147 – Maintenance Training Organisations',
    sector: ['Aerospace'],
    jurisdiction: 'European Union',
    website: 'https://www.easa.europa.eu/en/regulations/part-147',
    type: 'Regulation',
    parentRegulator: 'easa',
    active: true
  },
  {
    id: 'easa-part-148',
    name: 'EASA Part 148 – Repair Training Organisations',
    sector: ['Aerospace'],
    jurisdiction: 'European Union',
    website: 'https://www.easa.europa.eu/en/regulations/part-148',
    type: 'Regulation',
    parentRegulator: 'easa',
    active: true
  },
  {
    id: 'caac',
    name: 'Civil Aviation Administration of China (CAAC)',
    sector: ['Aerospace'],
    jurisdiction: 'China',
    website: 'https://www.caac.gov.cn/en/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },
  {
    id: 'tcca',
    name: 'Transport Canada Civil Aviation (TCCA)',
    sector: ['Aerospace'],
    jurisdiction: 'Canada',
    website: 'https://tc.canada.ca/en/aviation',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },
  {
    id: 'tcca-part-5',
    name: 'TCCA Part 5 – Airworthiness',
    sector: ['Aerospace'],
    jurisdiction: 'Canada',
    website: 'https://tc.canada.ca/en/aviation/regulations/standards/standards-521-001',
    type: 'Regulation',
    parentRegulator: 'tcca',
    active: true
  },
  {
    id: 'tcca-part-vi',
    name: 'TCCA Part VI – Maintenance and Manufacturing',
    sector: ['Aerospace'],
    jurisdiction: 'Canada',
    website: 'https://tc.canada.ca/en/aviation/regulations/standards/standards-566-001',
    type: 'Regulation',
    parentRegulator: 'tcca',
    active: true
  },
  {
    id: 'tcca-part-vii',
    name: 'TCCA Part VII – Commercial Air Services',
    sector: ['Aerospace'],
    jurisdiction: 'Canada',
    website: 'https://tc.canada.ca/en/aviation/regulations/standards/standards-723-001',
    type: 'Regulation',
    parentRegulator: 'tcca',
    active: true
  },
  {
    id: 'caa-uk',
    name: 'Civil Aviation Authority (CAA)',
    sector: ['Aerospace'],
    jurisdiction: 'United Kingdom',
    website: 'https://www.caa.co.uk/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },
  {
    id: 'dgac-fr',
    name: "Direction Générale de l'Aviation Civile (DGAC)",
    sector: ['Aerospace'],
    jurisdiction: 'France',
    website: 'https://www.ecologie.gouv.fr/direction-generale-laviation-civile',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },
  {
    id: 'afac',
    name: 'Agencia Federal de Aviación Civil (AFAC)',
    sector: ['Aerospace'],
    jurisdiction: 'Mexico',
    website: 'https://www.gob.mx/afac',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },
  {
    id: 'casa',
    name: 'Civil Aviation Safety Authority (CASA)',
    sector: ['Aerospace'],
    jurisdiction: 'Australia',
    website: 'https://www.casa.gov.au/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },
  {
    id: 'casa-part-21',
    name: 'CASA Part 21 – Certification of Aircraft and Related Products',
    sector: ['Aerospace'],
    jurisdiction: 'Australia',
    website: 'https://www.casa.gov.au/rules-and-regulations/rules/part-21',
    type: 'Regulation',
    parentRegulator: 'casa',
    active: true
  },
  {
    id: 'casa-part-42',
    name: 'CASA Part 42 – Continuing Airworthiness',
    sector: ['Aerospace'],
    jurisdiction: 'Australia',
    website: 'https://www.casa.gov.au/rules-and-regulations/rules/part-42',
    type: 'Regulation',
    parentRegulator: 'casa',
    active: true
  },
  {
    id: 'casa-part-145',
    name: 'CASA Part 145 – Maintenance Organisations',
    sector: ['Aerospace'],
    jurisdiction: 'Australia',
    website: 'https://www.casa.gov.au/rules-and-regulations/rules/part-145',
    type: 'Regulation',
    parentRegulator: 'casa',
    active: true
  },
  {
    id: 'casa-part-147',
    name: 'CASA Part 147 – Maintenance Training Organisations',
    sector: ['Aerospace'],
    jurisdiction: 'Australia',
    website: 'https://www.casa.gov.au/rules-and-regulations/rules/part-147',
    type: 'Regulation',
    parentRegulator: 'casa',
    active: true
  },
  {
    id: 'jcab',
    name: 'Japan Civil Aviation Bureau (JCAB)',
    sector: ['Aerospace'],
    jurisdiction: 'Japan',
    website: 'https://www.mlit.go.jp/en/koku/index.html',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },
  {
    id: 'caas',
    name: 'Civil Aviation Authority of Singapore (CAAS)',
    sector: ['Aerospace'],
    jurisdiction: 'Singapore',
    website: 'https://www.caas.gov.sg/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },
  {
    id: 'gaca',
    name: 'General Authority of Civil Aviation (GACA)',
    sector: ['Aerospace'],
    jurisdiction: 'Saudi Arabia',
    website: 'https://gaca.gov.sa/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },
  {
    id: 'dgca-in',
    name: 'Directorate General of Civil Aviation (DGCA)',
    sector: ['Aerospace'],
    jurisdiction: 'India',
    website: 'https://www.dgca.gov.in/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },
  {
    id: 'sacaa',
    name: 'South African Civil Aviation Authority (SACAA)',
    sector: ['Aerospace'],
    jurisdiction: 'South Africa',
    website: 'https://www.caa.co.za/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },
  {
    id: 'nzcaa',
    name: 'Civil Aviation Authority of New Zealand (CAA NZ)',
    sector: ['Aerospace'],
    jurisdiction: 'New Zealand',
    website: 'https://www.aviation.govt.nz/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },
  {
    id: 'anac',
    name: 'Agência Nacional de Aviação Civil (ANAC)',
    sector: ['Aerospace'],
    jurisdiction: 'Brazil',
    website: 'https://www.gov.br/anac/en',
    type: 'Regulator',
    approvalTypes: ['Production', 'Repair', 'Maintenance'],
    active: true
  },

  // Medical device regulators
  {
    id: 'us-fda',
    name: 'U.S. Food and Drug Administration (FDA) – Center for Devices and Radiological Health',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'United States',
    website: 'https://www.fda.gov/medical-devices/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'ema',
    name: 'European Medicines Agency (EMA)',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'European Union',
    website: 'https://www.ema.europa.eu/en',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'eu-commission-health',
    name: 'European Commission – DG SANTE (EU MDR/IVDR Framework)',
    sector: ['Medical Devices'],
    jurisdiction: 'European Union',
    website: 'https://health.ec.europa.eu/medical-devices-sector/new-regulations_en',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'health-canada',
    name: 'Health Canada – Medical Devices',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'Canada',
    website: 'https://www.canada.ca/en/health-canada/services/drugs-health-products/medical-devices.html',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'tga',
    name: 'Therapeutic Goods Administration (TGA)',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'Australia',
    website: 'https://www.tga.gov.au/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'pmda',
    name: 'Pharmaceuticals and Medical Devices Agency (PMDA) / MHLW',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'Japan',
    website: 'https://www.pmda.go.jp/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'nmpa',
    name: 'National Medical Products Administration (NMPA)',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'China',
    website: 'https://www.nmpa.gov.cn/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'anvisa',
    name: 'Agência Nacional de Vigilância Sanitária (ANVISA)',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'Brazil',
    website: 'https://www.gov.br/anvisa/en/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'mfds',
    name: 'Ministry of Food and Drug Safety (MFDS)',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'South Korea',
    website: 'https://www.mfds.go.kr/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'mhra',
    name: 'Medicines and Healthcare products Regulatory Agency (MHRA)',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'United Kingdom',
    website: 'https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'swissmedic',
    name: 'Swissmedic',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'Switzerland',
    website: 'https://www.swissmedic.ch/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'hsa',
    name: 'Health Sciences Authority (HSA)',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'Singapore',
    website: 'https://www.hsa.gov.sg/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'cdsco',
    name: 'Central Drugs Standard Control Organisation (CDSCO)',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'India',
    website: 'https://cdsco.gov.in/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'sahpra',
    name: 'South African Health Products Regulatory Authority (SAHPRA)',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'South Africa',
    website: 'https://www.sahpra.org.za/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'cofepris',
    name: 'Comisión Federal para la Protección contra Riesgos Sanitarios (COFEPRIS)',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'Mexico',
    website: 'https://www.gob.mx/cofepris',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },
  {
    id: 'roszdravnadzor',
    name: 'Federal Service for Surveillance in Healthcare (Roszdravnadzor)',
    sector: ['Medical Devices', 'Pharmaceutical Manufacturing'],
    jurisdiction: 'Russia',
    website: 'https://roszdravnadzor.gov.ru/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Clinical'],
    active: true
  },

  // Automotive regulators
  {
    id: 'nhtsa',
    name: 'National Highway Traffic Safety Administration (NHTSA)',
    sector: ['Automotive'],
    jurisdiction: 'United States',
    website: 'https://www.nhtsa.gov/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },
  {
    id: 'dg-move',
    name: 'European Commission DG MOVE / UNECE WP.29',
    sector: ['Automotive'],
    jurisdiction: 'European Union / UNECE Contracting Parties',
    website: 'https://transport.ec.europa.eu/transport-themes/road-safety/vehicle-safety_en',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },
  {
    id: 'transport-canada-road',
    name: 'Transport Canada – Motor Vehicle Safety',
    sector: ['Automotive'],
    jurisdiction: 'Canada',
    website: 'https://tc.canada.ca/en/road-transportation/vehicle-safety',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },
  {
    id: 'mlit-road',
    name: 'Ministry of Land, Infrastructure, Transport and Tourism (MLIT)',
    sector: ['Automotive'],
    jurisdiction: 'Japan',
    website: 'https://www.mlit.go.jp/en/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },
  {
    id: 'samr',
    name: 'State Administration for Market Regulation (SAMR)',
    sector: ['Automotive'],
    jurisdiction: 'China',
    website: 'https://www.samr.gov.cn/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },
  {
    id: 'molit',
    name: 'Ministry of Land, Infrastructure and Transport (MOLIT)',
    sector: ['Automotive'],
    jurisdiction: 'South Korea',
    website: 'https://www.molit.go.kr/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },
  {
    id: 'senatran',
    name: 'Departamento Nacional de Trânsito (DENATRAN / SENATRAN)',
    sector: ['Automotive'],
    jurisdiction: 'Brazil',
    website: 'https://www.gov.br/senatran/pt-br',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },
  {
    id: 'arai',
    name: 'Automotive Research Association of India (ARAI)',
    sector: ['Automotive'],
    jurisdiction: 'India',
    website: 'https://www.araiindia.com/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },
  {
    id: 'kba',
    name: 'Kraftfahrt-Bundesamt (KBA)',
    sector: ['Automotive'],
    jurisdiction: 'Germany',
    website: 'https://www.kba.de/EN/Home/home_node.html',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },
  {
    id: 'vca',
    name: 'Vehicle Certification Agency (VCA)',
    sector: ['Automotive'],
    jurisdiction: 'United Kingdom',
    website: 'https://www.gov.uk/government/organisations/vehicle-certification-agency',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },
  {
    id: 'infrastructure-au',
    name: 'Department of Infrastructure – Vehicle Safety Standards',
    sector: ['Automotive'],
    jurisdiction: 'Australia',
    website: 'https://www.infrastructure.gov.au/vehicles-safety-standards',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },
  {
    id: 'sabs',
    name: 'South African Bureau of Standards (SABS)',
    sector: ['Automotive'],
    jurisdiction: 'South Africa',
    website: 'https://www.sabs.co.za/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },
  {
    id: 'rosstandart',
    name: 'Federal Agency for Technical Regulation and Metrology (Rosstandart)',
    sector: ['Automotive', 'Cross-Sector'],
    jurisdiction: 'Russia',
    website: 'https://www.gost.ru/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },
  {
    id: 'secretaria-economia',
    name: 'Secretaría de Economía – Automotive Regulation',
    sector: ['Automotive'],
    jurisdiction: 'Mexico',
    website: 'https://www.gob.mx/se',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },
  {
    id: 'dlt',
    name: 'Department of Land Transport (DLT)',
    sector: ['Automotive'],
    jurisdiction: 'Thailand',
    website: 'https://www.dlt.go.th/',
    type: 'Regulator',
    approvalTypes: ['Production', 'Safety', 'Emissions'],
    active: true
  },

  // GMP / Pharmaceutical regulators & programmes
  {
    id: 'fda-cgmp',
    name: 'U.S. Food and Drug Administration (FDA) – CDER/CBER',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'United States',
    website: 'https://www.fda.gov/drugs/pharmaceutical-quality-resources/current-good-manufacturing-practice-cgmp-regulations',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  },
  {
    id: 'ema-gmp',
    name: 'European Medicines Agency (EMA) – GMP',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'European Union',
    website: 'https://www.ema.europa.eu/en/human-regulatory/overview/good-manufacturing-practice-gmp',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  },
  {
    id: 'pmda-gmp',
    name: 'PMDA / MHLW – GMP',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'Japan',
    website: 'https://www.pmda.go.jp/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  },
  {
    id: 'health-canada-gmp',
    name: 'Health Canada – GMP',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'Canada',
    website: 'https://www.canada.ca/en/health-canada/services/drugs-health-products/medicines.html',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  },
  {
    id: 'tga-gmp',
    name: 'Therapeutic Goods Administration (TGA) – GMP',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'Australia',
    website: 'https://www.tga.gov.au/manufacturing-therapeutic-goods',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  },
  {
    id: 'swissmedic-gmp',
    name: 'Swissmedic – GMP',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'Switzerland',
    website: 'https://www.swissmedic.ch/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  },
  {
    id: 'sahpra-gmp',
    name: 'South African Health Products Regulatory Authority (SAHPRA) – GMP',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'South Africa',
    website: 'https://www.sahpra.org.za/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  },
  {
    id: 'nmpa-gmp',
    name: 'National Medical Products Administration (NMPA) – GMP',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'China',
    website: 'https://www.nmpa.gov.cn/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  },
  {
    id: 'anvisa-gmp',
    name: 'Agência Nacional de Vigilância Sanitária (ANVISA) – GMP',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'Brazil',
    website: 'https://www.gov.br/anvisa/en/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  },
  {
    id: 'mhra-gmp',
    name: 'Medicines and Healthcare products Regulatory Agency (MHRA) – GMP',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'United Kingdom',
    website: 'https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  },
  {
    id: 'mfds-gmp',
    name: 'Ministry of Food and Drug Safety (MFDS) – GMP',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'South Korea',
    website: 'https://www.mfds.go.kr/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  },
  {
    id: 'hsa-gmp',
    name: 'Health Sciences Authority (HSA) – GMP',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'Singapore',
    website: 'https://www.hsa.gov.sg/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  },
  {
    id: 'cdsco-gmp',
    name: 'Central Drugs Standard Control Organisation (CDSCO) – GMP',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'India',
    website: 'https://cdsco.gov.in/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  },
  {
    id: 'roszdravnadzor-gmp',
    name: 'Roszdravnadzor – GMP',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'Russia',
    website: 'https://roszdravnadzor.gov.ru/',
    type: 'Regulator',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  },
  {
    id: 'who-gmp',
    name: 'World Health Organization (WHO) – GMP Programme',
    sector: ['Pharmaceutical Manufacturing'],
    jurisdiction: 'Global',
    website: 'https://www.who.int/teams/health-product-policy-and-standards/standards-and-specifications/gmp',
    type: 'Program',
    approvalTypes: ['Manufacturing', 'Quality', 'Distribution'],
    active: true
  }
];

const STANDARDS = [
  // Aerospace
  {
    id: 'as9100d',
    code: 'AS9100D',
    name: 'Quality Management Systems – Requirements for Aviation, Space and Defense Organizations',
    sector: ['Aerospace'],
    certifiable: true,
    type: 'Standard',
    official_source: 'SAE International / IAQG',
    purchase_or_info_url: 'https://www.sae.org/standards/content/as9100d/'
  },
  {
    id: 'as9110c',
    code: 'AS9110C',
    name: 'Quality Management Systems – Requirements for Aviation Maintenance Organizations',
    sector: ['Aerospace'],
    certifiable: true,
    type: 'Standard',
    official_source: 'SAE International / IAQG',
    purchase_or_info_url: 'https://www.sae.org/standards/content/as9110c/'
  },
  {
    id: 'as9120b',
    code: 'AS9120B',
    name: 'Quality Management Systems – Requirements for Aviation, Space and Defense Distributors',
    sector: ['Aerospace'],
    certifiable: true,
    type: 'Standard',
    official_source: 'SAE International / IAQG',
    purchase_or_info_url: 'https://www.sae.org/standards/content/as9120b/'
  },
  {
    id: 'as9145',
    code: 'AS9145',
    name: 'Requirements for Advanced Product Quality Planning and Production Part Approval Process',
    sector: ['Aerospace'],
    certifiable: false,
    type: 'Standard',
    official_source: 'SAE International / IAQG',
    purchase_or_info_url: 'https://www.sae.org/standards/content/as9145/'
  },
  {
    id: 'as13100',
    code: 'AS13100',
    name: 'AESQ Quality Management System Requirements for Aero Engine Design and Production Organizations',
    sector: ['Aerospace'],
    certifiable: true,
    type: 'Standard',
    official_source: 'SAE International / AESQ',
    purchase_or_info_url: 'https://www.sae.org/standards/content/as13100/'
  },
  {
    id: 'as5553',
    code: 'AS5553',
    name: 'Counterfeit Electronic Parts; Avoidance, Detection, Mitigation, and Disposition',
    sector: ['Aerospace', 'Electronics'],
    certifiable: false,
    type: 'Standard',
    official_source: 'SAE International',
    purchase_or_info_url: 'https://www.sae.org/standards/content/as5553/'
  },
  {
    id: 'as6081',
    code: 'AS6081',
    name: 'Counterfeit Electronic Parts: Avoidance Protocol, Distributors',
    sector: ['Aerospace', 'Electronics'],
    certifiable: false,
    type: 'Standard',
    official_source: 'SAE International',
    purchase_or_info_url: 'https://www.sae.org/standards/content/as6081/'
  },
  {
    id: 'as9102',
    code: 'AS9102',
    name: 'Aerospace First Article Inspection Requirement',
    sector: ['Aerospace'],
    certifiable: false,
    type: 'Standard',
    official_source: 'SAE International / IAQG',
    purchase_or_info_url: 'https://www.sae.org/standards/content/as9102c/'
  },
  {
    id: 'en9100',
    code: 'EN 9100 / JISQ 9100',
    name: 'Aerospace Quality Management Systems – Regional Variants',
    sector: ['Aerospace'],
    certifiable: true,
    type: 'Standard',
    official_source: 'International Aerospace Quality Group (IAQG)',
    purchase_or_info_url: 'https://iaqg.org/standards/'
  },
  {
    id: 'nadcap-ac7004',
    code: 'NADCAP AC7004',
    name: 'NADCAP Quality System Accreditation for Non-Destructive Testing Providers',
    sector: ['Aerospace'],
    certifiable: true,
    type: 'Accreditation Program',
    official_source: 'Performance Review Institute (PRI)',
    purchase_or_info_url: 'https://p-r-i.org/nadcap/'
  },

  // Medical devices
  {
    id: 'iso13485',
    code: 'ISO 13485:2016',
    name: 'Medical devices – Quality management systems – Requirements for regulatory purposes',
    sector: ['Medical Devices'],
    certifiable: true,
    type: 'Standard',
    official_source: 'International Organization for Standardization (ISO)',
    purchase_or_info_url: 'https://www.iso.org/standard/59752.html'
  },
  {
    id: 'mdsap',
    code: 'MDSAP',
    name: 'Medical Device Single Audit Program',
    sector: ['Medical Devices'],
    certifiable: true,
    type: 'Program',
    official_source: 'International Medical Device Regulators Forum (IMDRF)',
    purchase_or_info_url: 'https://www.fda.gov/medical-devices/medical-device-single-audit-program-mdsap'
  },
  {
    id: 'iso14971',
    code: 'ISO 14971:2019',
    name: 'Medical devices – Application of risk management to medical devices',
    sector: ['Medical Devices'],
    certifiable: false,
    type: 'Standard',
    official_source: 'ISO',
    purchase_or_info_url: 'https://www.iso.org/standard/72704.html'
  },
  {
    id: 'iec60601-1',
    code: 'IEC 60601-1',
    name: 'Medical electrical equipment – Part 1: General requirements for basic safety and essential performance',
    sector: ['Medical Devices'],
    certifiable: true,
    type: 'Standard',
    official_source: 'International Electrotechnical Commission (IEC)',
    purchase_or_info_url: 'https://webstore.iec.ch/publication/2612'
  },
  {
    id: 'iso14155',
    code: 'ISO 14155:2020',
    name: 'Clinical investigation of medical devices for human subjects – Good clinical practice',
    sector: ['Medical Devices'],
    certifiable: false,
    type: 'Standard',
    official_source: 'ISO',
    purchase_or_info_url: 'https://www.iso.org/standard/71690.html'
  },
  {
    id: 'iso10993',
    code: 'ISO 10993 Series',
    name: 'Biological evaluation of medical devices',
    sector: ['Medical Devices'],
    certifiable: false,
    type: 'Standard Family',
    official_source: 'ISO',
    purchase_or_info_url: 'https://www.iso.org/ics/11.100.20/x/'
  },
  {
    id: 'iso15223-1',
    code: 'ISO 15223-1',
    name: 'Medical devices – Symbols to be used with information supplied by the manufacturer',
    sector: ['Medical Devices'],
    certifiable: false,
    type: 'Standard',
    official_source: 'ISO',
    purchase_or_info_url: 'https://www.iso.org/standard/82223.html'
  },
  {
    id: 'iso20417',
    code: 'ISO 20417:2021',
    name: 'Medical devices – Information to be supplied by the manufacturer',
    sector: ['Medical Devices'],
    certifiable: false,
    type: 'Standard',
    official_source: 'ISO',
    purchase_or_info_url: 'https://www.iso.org/standard/77826.html'
  },
  {
    id: 'eu-mdr-ivdr',
    code: 'EU MDR/IVDR',
    name: 'European Union Medical Device and In Vitro Diagnostic Regulations',
    sector: ['Medical Devices'],
    certifiable: true,
    type: 'Regulation',
    official_source: 'European Commission',
    purchase_or_info_url: 'https://health.ec.europa.eu/medical-devices-sector/new-regulations_en'
  },
  {
    id: '21cfr820',
    code: '21 CFR Part 820',
    name: 'Quality System Regulation (QSR)',
    sector: ['Medical Devices'],
    certifiable: true,
    type: 'Regulation',
    official_source: 'U.S. Food and Drug Administration',
    purchase_or_info_url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-H/part-820'
  },

  // Automotive
  {
    id: 'iatf16949',
    code: 'IATF 16949:2016',
    name: 'Quality management system requirements for automotive production and relevant service parts organizations',
    sector: ['Automotive'],
    certifiable: true,
    type: 'Standard',
    official_source: 'International Automotive Task Force (IATF)',
    purchase_or_info_url: 'https://www.iatfglobaloversight.org/iatf-16949/'
  },
  {
    id: 'iso26262',
    code: 'ISO 26262:2018',
    name: 'Road vehicles – Functional safety',
    sector: ['Automotive'],
    certifiable: true,
    type: 'Standard',
    official_source: 'ISO',
    purchase_or_info_url: 'https://www.iso.org/standard/68383.html'
  },
  {
    id: 'vda63',
    code: 'VDA 6.3',
    name: 'Process audit for product and process development and serial production',
    sector: ['Automotive'],
    certifiable: true,
    type: 'Standard',
    official_source: 'Verband der Automobilindustrie (VDA)',
    purchase_or_info_url: 'https://webshop.vda.de/'
  },
  {
    id: 'iso21434',
    code: 'ISO/SAE 21434:2021',
    name: 'Road vehicles – Cybersecurity engineering',
    sector: ['Automotive'],
    certifiable: true,
    type: 'Standard',
    official_source: 'ISO / SAE International',
    purchase_or_info_url: 'https://www.iso.org/standard/74399.html'
  },
  {
    id: 'cqi-series',
    code: 'CQI Series',
    name: 'AIAG Special Process Assessments (CQI-9, CQI-11, CQI-15, etc.)',
    sector: ['Automotive'],
    certifiable: false,
    type: 'Assessment Framework',
    official_source: 'AIAG',
    purchase_or_info_url: 'https://www.aiag.org/quality/cqi'
  },

  // Cross-sector foundational
  {
    id: 'iso9001',
    code: 'ISO 9001:2015',
    name: 'Quality management systems – Requirements',
    sector: ['Cross-Sector'],
    certifiable: true,
    type: 'Standard',
    official_source: 'ISO',
    purchase_or_info_url: 'https://www.iso.org/standard/62085.html'
  },
  {
    id: 'iso14001',
    code: 'ISO 14001:2015',
    name: 'Environmental management systems – Requirements with guidance for use',
    sector: ['Cross-Sector'],
    certifiable: true,
    type: 'Standard',
    official_source: 'ISO',
    purchase_or_info_url: 'https://www.iso.org/standard/60857.html'
  },
  {
    id: 'iso45001',
    code: 'ISO 45001:2018',
    name: 'Occupational health and safety management systems – Requirements with guidance for use',
    sector: ['Cross-Sector'],
    certifiable: true,
    type: 'Standard',
    official_source: 'ISO',
    purchase_or_info_url: 'https://www.iso.org/standard/63787.html'
  },
  {
    id: 'iso27001',
    code: 'ISO/IEC 27001:2022',
    name: 'Information security, cybersecurity and privacy protection – Information security management systems',
    sector: ['Cross-Sector'],
    certifiable: true,
    type: 'Standard',
    official_source: 'ISO / IEC',
    purchase_or_info_url: 'https://www.iso.org/standard/82875.html'
  },
  {
    id: 'iso22301',
    code: 'ISO 22301:2019',
    name: 'Security and resilience – Business continuity management systems – Requirements',
    sector: ['Cross-Sector'],
    certifiable: true,
    type: 'Standard',
    official_source: 'ISO',
    purchase_or_info_url: 'https://www.iso.org/standard/75106.html'
  },
  {
    id: 'iso50001',
    code: 'ISO 50001:2018',
    name: 'Energy management systems – Requirements with guidance for use',
    sector: ['Cross-Sector'],
    certifiable: true,
    type: 'Standard',
    official_source: 'ISO',
    purchase_or_info_url: 'https://www.iso.org/standard/69426.html'
  },
  {
    id: 'iso31000',
    code: 'ISO 31000:2018',
    name: 'Risk management – Guidelines',
    sector: ['Cross-Sector'],
    certifiable: false,
    type: 'Guideline',
    official_source: 'ISO',
    purchase_or_info_url: 'https://www.iso.org/standard/65694.html'
  }
];

function normaliseId(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function getRegulatorsByIds(ids = []) {
  const lookup = new Map(REGULATORY_BODIES.map((entry) => [entry.id, entry]));
  const resolved = [];
  const unknown = [];

  ids.forEach((rawId) => {
    const id = normaliseId(rawId);
    if (lookup.has(id)) {
      resolved.push(lookup.get(id));
    } else if (id) {
      unknown.push(id);
    }
  });

  return { resolved, unknown };
}

function getStandardsByIds(ids = []) {
  const lookup = new Map(STANDARDS.map((entry) => [entry.id, entry]));
  const resolved = [];
  const unknown = [];

  ids.forEach((rawId) => {
    const id = normaliseId(rawId);
    if (lookup.has(id)) {
      resolved.push(lookup.get(id));
    } else if (id) {
      unknown.push(id);
    }
  });

  return { resolved, unknown };
}

function createRegulatorOptionList() {
  const regulatorMap = new Map();
  const parts = [];
  
  // First pass: collect parent regulators and parts separately
  REGULATORY_BODIES.forEach((regulator) => {
    if (regulator.parentRegulator) {
      parts.push(regulator);
    } else {
      regulatorMap.set(regulator.id, regulator);
    }
  });
  
  // Build options list
  const options = [];
  
  // Add parent regulators first
  regulatorMap.forEach((regulator) => {
    const sectorCategory = regulator.sector && regulator.sector.length 
      ? regulator.sector.join(', ') 
      : 'Regulators';
    
    options.push({
      value: regulator.id,
      label: regulator.jurisdiction ? `${regulator.name} (${regulator.jurisdiction})` : regulator.name,
      category: sectorCategory,
      website: regulator.website || null,
      data: regulator,
      source: 'library'
    });
    
    // Add parts for this regulator
    const regulatorParts = parts.filter(p => p.parentRegulator === regulator.id);
    regulatorParts.forEach((part) => {
      const parentName = regulator.name.split('(')[0].trim();
      options.push({
        value: part.id,
        label: part.name,
        category: `${sectorCategory} - ${parentName} Parts`,
        website: part.website || regulator.website || null,
        data: part,
        source: 'library'
      });
    });
  });
  
  // Add any orphaned parts (parent not found)
  parts.forEach((part) => {
    if (!regulatorMap.has(part.parentRegulator)) {
      const sectorCategory = part.sector && part.sector.length 
        ? part.sector.join(', ') 
        : 'Regulators';
      options.push({
        value: part.id,
        label: part.name,
        category: `${sectorCategory} - Parts`,
        website: part.website || null,
        data: part,
        source: 'library'
      });
    }
  });
  
  return options;
}

function createStandardOptionList() {
  return STANDARDS.map((standard) => ({
    value: standard.id,
    label: `${standard.code} – ${standard.name}`,
    category: standard.sector && standard.sector.length ? standard.sector.join(', ') : 'Standards',
    website: standard.purchase_or_info_url || null,
    data: standard,
    source: 'library'
  }));
}

function logLibraryStats(logger = console) {
  if (!logger || typeof logger.info !== 'function') return;
  logger.info(
    `[EDCAT Library] Loaded ${REGULATORY_BODIES.length} regulatory bodies and ${STANDARDS.length} standards from canonical catalogue.`
  );
}

// Helper function to get approval types for a regulator based on its category
function getApprovalTypesForCategory(category) {
  const categoryMap = {
    'Aerospace': 'aerospace',
    'Medical Device': 'medical',
    'Automotive': 'automotive',
    'GMP / Pharmaceutical Regulators': 'pharma',
    'GMP/Pharmaceutical Regulators': 'pharma'
  };
  const sectorKey = categoryMap[category] || category.toLowerCase();
  const definitions = APPROVAL_TYPE_DEFINITIONS[sectorKey];
  return definitions ? Object.keys(definitions) : [];
}

// Get regulators by category with approval types
function getRegulatorsByCategory(category) {
  const categoryMap = {
    'all': null,
    'aerospace': 'Aerospace',
    'medical': 'Medical Device',
    'automotive': 'Automotive',
    'pharma': 'GMP / Pharmaceutical Regulators'
  };
  const targetCategory = categoryMap[category] || category;
  if (targetCategory === null) {
    return REGULATORY_BODIES.filter(r => r.type === 'Regulator' && !r.parentRegulator);
  }
  return REGULATORY_BODIES.filter(r => 
    r.type === 'Regulator' && 
    !r.parentRegulator &&
    r.sector && r.sector.includes(targetCategory)
  );
}

// ============================================================================
// OEM / CUSTOMER REQUIREMENTS LIBRARY
// ============================================================================
const OEM_CUSTOMERS = [
  // Aerospace OEMs
  {
    id: 'boeing',
    name: 'Boeing',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.boeing.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'airbus',
    name: 'Airbus',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'European Union',
    website: 'https://www.airbus.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'embraer',
    name: 'Embraer',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'Brazil',
    website: 'https://www.embraer.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'bombardier',
    name: 'Bombardier Aerospace',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'Canada',
    website: 'https://www.bombardier.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'gulfstream',
    name: 'Gulfstream Aerospace',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.gulfstream.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'textron-aviation',
    name: 'Textron Aviation (Cessna/Beechcraft)',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.textronaviation.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'dassault',
    name: 'Dassault Aviation',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'France',
    website: 'https://www.dassault-aviation.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'safran',
    name: 'Safran',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'France',
    website: 'https://www.safran-group.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'rolls-royce',
    name: 'Rolls-Royce',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'United Kingdom',
    website: 'https://www.rolls-royce.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'ge-aviation',
    name: 'GE Aviation',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.ge.com/aviation/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'pratt-whitney',
    name: 'Pratt & Whitney',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.prattwhitney.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'honeywell',
    name: 'Honeywell Aerospace',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.honeywell.com/us/en/industries/aerospace',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'collins-aerospace',
    name: 'Collins Aerospace',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.collinsaerospace.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'thales',
    name: 'Thales',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'France',
    website: 'https://www.thalesgroup.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'lockheed-martin',
    name: 'Lockheed Martin',
    type: 'OEM',
    sector: ['Aerospace', 'Defense'],
    jurisdiction: 'United States',
    website: 'https://www.lockheedmartin.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'northrop-grumman',
    name: 'Northrop Grumman',
    type: 'OEM',
    sector: ['Aerospace', 'Defense'],
    jurisdiction: 'United States',
    website: 'https://www.northropgrumman.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'raytheon',
    name: 'Raytheon Technologies',
    type: 'OEM',
    sector: ['Aerospace', 'Defense'],
    jurisdiction: 'United States',
    website: 'https://www.rtx.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'leonardo',
    name: 'Leonardo',
    type: 'OEM',
    sector: ['Aerospace', 'Defense'],
    jurisdiction: 'Italy',
    website: 'https://www.leonardo.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'saab',
    name: 'Saab',
    type: 'OEM',
    sector: ['Aerospace', 'Defense'],
    jurisdiction: 'Sweden',
    website: 'https://www.saab.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'mitsubishi-heavy',
    name: 'Mitsubishi Heavy Industries Aerospace',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'Japan',
    website: 'https://www.mhi.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'comac',
    name: 'COMAC (Commercial Aircraft Corporation of China)',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'China',
    website: 'https://www.comac.cc/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'irkut',
    name: 'Irkut Corporation',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'Russia',
    website: 'https://www.irkut.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'hal',
    name: 'Hindustan Aeronautics Limited (HAL)',
    type: 'OEM',
    sector: ['Aerospace', 'Defense'],
    jurisdiction: 'India',
    website: 'https://hal-india.co.in/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'korean-air',
    name: 'Korean Air Aerospace Division',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'South Korea',
    website: 'https://www.koreanair.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'turkish-aerospace',
    name: 'Turkish Aerospace Industries',
    type: 'OEM',
    sector: ['Aerospace', 'Defense'],
    jurisdiction: 'Turkey',
    website: 'https://www.tai.com.tr/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'aeroflot',
    name: 'Aeroflot (MRO Requirements)',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'Russia',
    website: 'https://www.aeroflot.ru/',
    requirementTypes: ['Maintenance', 'Repair', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'lufthansa-technik',
    name: 'Lufthansa Technik',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'Germany',
    website: 'https://www.lufthansa-technik.com/',
    requirementTypes: ['Maintenance', 'Repair', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'air-france-klm',
    name: 'Air France-KLM Engineering & Maintenance',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'France/Netherlands',
    website: 'https://www.airfranceklm.com/',
    requirementTypes: ['Maintenance', 'Repair', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'singapore-airlines',
    name: 'Singapore Airlines Engineering',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'Singapore',
    website: 'https://www.singaporeair.com/',
    requirementTypes: ['Maintenance', 'Repair', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'cathay-pacific',
    name: 'Cathay Pacific Engineering',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'Hong Kong',
    website: 'https://www.cathaypacific.com/',
    requirementTypes: ['Maintenance', 'Repair', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'qantas',
    name: 'Qantas Engineering',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'Australia',
    website: 'https://www.qantas.com/',
    requirementTypes: ['Maintenance', 'Repair', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'delta-techops',
    name: 'Delta TechOps',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.delta.com/',
    requirementTypes: ['Maintenance', 'Repair', 'Quality', 'Supplier'],
    active: true
  },
  {
    id: 'united-technologies',
    name: 'United Technologies (UTC)',
    type: 'OEM',
    sector: ['Aerospace'],
    jurisdiction: 'United States',
    website: 'https://www.utc.com/',
    requirementTypes: ['Design', 'Production', 'Quality', 'Supplier'],
    active: true
  }
];

// Helper function to get OEMs by sector
function getOEMsBySector(sector) {
  if (!sector || sector === 'all') {
    return OEM_CUSTOMERS.filter(oem => oem.active);
  }
  return OEM_CUSTOMERS.filter(oem => 
    oem.active && oem.sector && oem.sector.includes(sector)
  );
}

// Helper function to get OEMs by ID
function getOEMsByIds(ids) {
  if (!Array.isArray(ids)) return [];
  return OEM_CUSTOMERS.filter(oem => ids.includes(oem.id));
}

const EDCATLibrary = {
  REGULATORY_BODIES,
  STANDARDS,
  OEM_CUSTOMERS,
  APPROVAL_TYPE_DEFINITIONS,
  getRegulatorsByIds,
  getStandardsByIds,
  getOEMsByIds,
  getOEMsBySector,
  getRegulatorsByCategory,
  getApprovalTypesForCategory,
  createRegulatorOptionList,
  createStandardOptionList,
  logLibraryStats
};

if (typeof window !== 'undefined') {
  window.EDCATLibrary = EDCATLibrary;
}

export default EDCATLibrary;
export {
  REGULATORY_BODIES,
  STANDARDS,
  OEM_CUSTOMERS,
  APPROVAL_TYPE_DEFINITIONS,
  getRegulatorsByIds,
  getStandardsByIds,
  getOEMsByIds,
  getOEMsBySector,
  getRegulatorsByCategory,
  getApprovalTypesForCategory,
  createRegulatorOptionList,
  createStandardOptionList,
  logLibraryStats
};

