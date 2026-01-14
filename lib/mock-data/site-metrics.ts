export interface SiteMetrics {
  siteNumber: string;
  studyName: string;
  siteName: string;
  isCompliant: boolean;
  crfsVerified: number;
  openQueries: number;
  answeredQueries: number;
  sdvPercentage: number;
}

const studyNames = [
  'EDITH IV',
  'AURORA II',
  'TITAN III',
  'PHOENIX I',
  'NEXUS II',
];

const siteNames = [
  'AvantGarde Essais Cliniques',
  'MediCore Research Institute',
  'Clinical Trials Center',
  'Advanced Medical Research',
  'Premier Health Studies',
  'Global Clinical Associates',
  'Precision Medicine Group',
  'Elite Research Partners',
  'Innovative Trials Center',
  'Metropolitan Clinical Research',
];

// Generate 43 sites from 5003 to 5114 (with some gaps as shown in the image)
const siteNumbers = [
  '5003', '5007', '5014', '5016', '5017', '5023', '5025', '5026', '5028', '5029', '5032', '5033',
  '5044', '5045', '5047', '5049', '5051', '5054', '5057', '5060', '5061', '5062', '5065', '5069',
  '5071', '5072', '5074', '5075', '5077', '5079', '5081', '5082', '5089', '5092', '5096', '5098',
  '5099', '5102', '5104', '5110', '5112', '5113', '5114',
];

// Simple seeded random function for deterministic results
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export const mockSiteMetrics: SiteMetrics[] = siteNumbers.map((siteNumber, index) => {
  // Generate realistic but deterministic metrics using seeded random
  const seed = parseInt(siteNumber);
  const isCompliant = seededRandom(seed) > 0.4; // ~60% compliant
  const crfsVerified = Math.floor(seededRandom(seed + 1) * 300) + 300; // 300-600
  const openQueries = isCompliant ? Math.floor(seededRandom(seed + 2) * 10) : Math.floor(seededRandom(seed + 2) * 40) + 10; // 0-10 for compliant, 10-50 for not
  const answeredQueries = Math.floor(seededRandom(seed + 3) * 30) + 5; // 5-35
  const sdvPercentage = Math.floor(seededRandom(seed + 4) * 100); // 0-100%

  return {
    siteNumber,
    studyName: studyNames[index % studyNames.length],
    siteName: siteNames[index % siteNames.length],
    isCompliant,
    crfsVerified,
    openQueries,
    answeredQueries,
    sdvPercentage,
  };
});
