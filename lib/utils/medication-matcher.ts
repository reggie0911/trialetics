/**
 * Medication Name Matcher Utility
 * 
 * Handles medication name variations/typos so the same medication
 * across visits gets grouped correctly using fuzzy matching.
 */

/**
 * Common medication suffixes to remove during normalization
 */
const MEDICATION_SUFFIXES = [
  'tablet', 'tablets', 'tab', 'tabs',
  'capsule', 'capsules', 'cap', 'caps',
  'mg', 'ml', 'g', 'mcg', 'iu',
  'oral', 'injection', 'inj',
  'extended-release', 'er', 'xr', 'sr', 'cr', 'dr',
  'immediate-release', 'ir',
  'solution', 'suspension', 'syrup',
  'cream', 'ointment', 'gel', 'lotion',
  'patch', 'spray', 'inhaler',
];

/**
 * Normalize a medication name for comparison
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes dosage numbers and units
 * - Removes common suffixes
 * - Removes special characters
 */
export function normalizeMedName(name: string | undefined | null): string {
  if (!name) return '';
  
  let normalized = name
    .trim()
    .toLowerCase()
    // Remove dosage patterns like "10mg", "250/250", "10.5mg", etc.
    .replace(/\d+([.,/]\d+)?\s*(mg|ml|g|mcg|iu|%)/gi, '')
    // Remove standalone numbers
    .replace(/\b\d+([.,/]\d+)?\b/g, '')
    // Remove special characters except spaces
    .replace(/[^a-z\s]/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove common suffixes
  for (const suffix of MEDICATION_SUFFIXES) {
    // Remove suffix at word boundary
    const regex = new RegExp(`\\b${suffix}\\b`, 'gi');
    normalized = normalized.replace(regex, '');
  }
  
  // Final cleanup
  return normalized.replace(/\s+/g, ' ').trim();
}

/**
 * Calculate Levenshtein distance between two strings
 * (minimum number of single-character edits to transform one into the other)
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create a matrix to store distances
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  
  // Initialize first column
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  
  // Initialize first row
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Check if two medication names are likely the same medication
 * Uses normalization and fuzzy matching
 * 
 * @param name1 First medication name
 * @param name2 Second medication name
 * @param threshold Maximum edit distance (default: 2 or 20% of length)
 */
export function areSameMedication(
  name1: string | undefined | null,
  name2: string | undefined | null,
  threshold?: number
): boolean {
  const norm1 = normalizeMedName(name1);
  const norm2 = normalizeMedName(name2);
  
  // Exact match after normalization
  if (norm1 === norm2) return true;
  
  // Empty strings don't match
  if (!norm1 || !norm2) return false;
  
  // Calculate dynamic threshold based on string length
  const maxLength = Math.max(norm1.length, norm2.length);
  const dynamicThreshold = threshold ?? Math.min(2, Math.floor(maxLength * 0.2));
  
  // Calculate edit distance
  const distance = levenshteinDistance(norm1, norm2);
  
  return distance <= dynamicThreshold;
}

/**
 * Medication cluster with canonical name and all variants
 */
export interface MedicationCluster {
  canonicalName: string;
  variants: string[];
  count: number;
}

/**
 * Build medication clusters from a list of medication names
 * Groups similar medications together and determines the canonical (most common) spelling
 * 
 * @param medicationNames Array of medication names to cluster
 * @returns Array of medication clusters
 */
export function buildMedicationClusters(
  medicationNames: (string | undefined | null)[]
): MedicationCluster[] {
  const clusters: MedicationCluster[] = [];
  const nameToCluster = new Map<string, number>(); // normalized name -> cluster index
  
  // Count occurrences of each exact name
  const nameCounts = new Map<string, number>();
  for (const name of medicationNames) {
    if (!name) continue;
    const trimmed = name.trim();
    nameCounts.set(trimmed, (nameCounts.get(trimmed) || 0) + 1);
  }
  
  for (const name of medicationNames) {
    if (!name) continue;
    
    const trimmedName = name.trim();
    const normalized = normalizeMedName(name);
    
    if (!normalized) continue;
    
    // Check if this name matches any existing cluster
    let foundCluster = false;
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      
      // Check against all variants in the cluster
      for (const variant of cluster.variants) {
        if (areSameMedication(trimmedName, variant)) {
          // Add to existing cluster
          if (!cluster.variants.includes(trimmedName)) {
            cluster.variants.push(trimmedName);
          }
          cluster.count++;
          nameToCluster.set(normalized, i);
          foundCluster = true;
          break;
        }
      }
      
      if (foundCluster) break;
    }
    
    if (!foundCluster) {
      // Create new cluster
      const newClusterIndex = clusters.length;
      clusters.push({
        canonicalName: trimmedName, // Will be updated later
        variants: [trimmedName],
        count: 1,
      });
      nameToCluster.set(normalized, newClusterIndex);
    }
  }
  
  // Determine canonical name for each cluster (most common spelling)
  for (const cluster of clusters) {
    let maxCount = 0;
    let canonical = cluster.variants[0];
    
    for (const variant of cluster.variants) {
      const count = nameCounts.get(variant) || 0;
      if (count > maxCount) {
        maxCount = count;
        canonical = variant;
      }
    }
    
    cluster.canonicalName = canonical;
  }
  
  return clusters;
}

/**
 * Create a mapping from original medication names to canonical names
 * 
 * @param medicationNames Array of all medication names in the dataset
 * @returns Map from original name to canonical name
 */
export function createMedicationMapping(
  medicationNames: (string | undefined | null)[]
): Map<string, string> {
  const clusters = buildMedicationClusters(medicationNames);
  const mapping = new Map<string, string>();
  
  for (const cluster of clusters) {
    for (const variant of cluster.variants) {
      mapping.set(variant, cluster.canonicalName);
    }
  }
  
  return mapping;
}

/**
 * Get the canonical medication name for a given name
 * Uses the provided mapping or returns the trimmed original if not found
 */
export function getCanonicalMedName(
  name: string | undefined | null,
  mapping: Map<string, string>
): string {
  if (!name) return '';
  const trimmed = name.trim();
  return mapping.get(trimmed) || trimmed;
}
