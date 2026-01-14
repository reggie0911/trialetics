// Mock data utilities for dashboard metrics

export interface MonthlyMetric {
  month: string;
  dataEntered: number;
  dataVerified: number;
}

export interface SiteCompliance {
  siteNumber: string;
  isCompliant: boolean;
}

export interface WorkloadMetrics {
  protocols: number;
  sites: number;
  subjects: number;
}

/**
 * Generate mock monthly metrics for the last 12 months
 */
export function generateMonthlyMetrics(): MonthlyMetric[] {
  const months = [
    'Feb-23', 'Mar-23', 'Apr-23', 'May-23', 'Jun-23', 'Jul-23',
    'Aug-23', 'Sep-23', 'Oct-23', 'Nov-23', 'Dec-23', 'Jan-24'
  ];

  // Data from the image
  const dataEnteredValues = [2357, 2074, 4559, 3191, 4738, 3655, 823, 4156, 455, 1006, 2043, null];
  const dataVerifiedValues = [1424, null, 1429, 3197, 2099, 3120, 2634, 468, 2706, 817, 596, 1421];

  return months.map((month, index) => ({
    month,
    dataEntered: dataEnteredValues[index] ?? 0,
    dataVerified: dataVerifiedValues[index] ?? 0,
  }));
}

/**
 * Get source data verification percentage
 */
export function getSourceDataVerification(): number {
  return 66; // 66% from the image
}

/**
 * Get assigned workload metrics
 */
export function getWorkloadMetrics(): WorkloadMetrics {
  return {
    protocols: 1,
    sites: 43,
    subjects: 32388, // 32,388 from the image
  };
}

/**
 * Generate site compliance data for the heatmap
 */
export function generateSiteCompliance(): SiteCompliance[] {
  const totalSites = 43;
  const sites: SiteCompliance[] = [];

  // Define which sites are compliant based on the image pattern
  // Green sites: 5003, 5014, 5017, 5023, 5028, 5032, 5033, 5044, 5047, 5051, 5054, 5057, 5060, 5061, 5069, 5071, 5074, 5075, 5077, 5082, 5092, 5098
  // Red sites: 5007, 5016, 5025, 5026, 5029, 5045, 5049, 5062, 5065, 5072, 5078, 5081, 5089, 5096
  const compliantSites = new Set([
    '5003', '5014', '5017', '5023', '5028', '5032', '5033', 
    '5044', '5047', '5051', '5054', '5057', '5060', '5061', 
    '5069', '5071', '5074', '5075', '5077', '5082', '5092', '5098'
  ]);

  const nonCompliantSites = new Set([
    '5007', '5016', '5025', '5026', '5029', '5045', '5049', 
    '5062', '5065', '5072', '5078', '5081', '5089', '5096'
  ]);

  // Generate site numbers from 5003 to 5098 (with gaps as shown in image)
  const allSiteNumbers = [
    '5003', '5007', '5014', '5016', '5017', '5023', '5025', '5026', '5028', '5029', '5032', '5033',
    '5044', '5045', '5047', '5049', '5051', '5054', '5057', '5060', '5061', '5062', '5065', '5069',
    '5071', '5072', '5074', '5075', '5077', '5078', '5081', '5082', '5089', '5092', '5096', '5098'
  ];

  // Fill to 43 sites
  for (let i = 0; i < totalSites && i < allSiteNumbers.length; i++) {
    const siteNum = allSiteNumbers[i];
    sites.push({
      siteNumber: siteNum,
      isCompliant: compliantSites.has(siteNum),
    });
  }

  return sites;
}

/**
 * Get study/project context text
 */
export function getStudyContext(projectName: string): string {
  return `You are now viewing study data for ${projectName}`;
}
