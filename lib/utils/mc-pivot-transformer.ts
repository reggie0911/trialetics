/**
 * MC Pivot Data Transformer
 * 
 * Transforms row-based medication compliance data into a pivot table view
 * where rows represent Patient + Medication combinations and columns
 * represent data across different study visits.
 */

import { createMedicationMapping, getCanonicalMedName } from './medication-matcher';

/**
 * MCRecord type from the CSV upload
 */
export interface MCRecord {
  [key: string]: string | undefined;
}

/**
 * Information about a field change
 */
export interface FieldChange {
  field: string;
  fieldLabel: string;
  previousValue: string;
  currentValue: string;
}

/**
 * Data for a single visit
 */
export interface VisitData {
  medicationName: string;
  dose: string;
  unit: string;
  frequency: string;
  startDate: string;
  startDateUnknown: string;
  stopDate: string;
  status: string;
  changeStatus: 'Yes' | 'No' | '-';
  changedFields: FieldChange[]; // List of fields that changed from previous visit
}

/**
 * A pivoted row representing a Patient + Medication across all visits
 */
export interface PivotRow {
  // Static columns
  siteName: string;
  subjectId: string;
  procedureDate: string;
  canonicalMedName: string;
  
  // Visit data keyed by visit name
  visits: Record<string, VisitData>;
}

/**
 * Result of the pivot transformation
 */
export interface PivotResult {
  rows: PivotRow[];
  visitOrder: string[];
  allVisits: string[];
}

/**
 * Known visit order for common visit names
 * Lower number = earlier visit
 */
const VISIT_ORDER_MAP: Record<string, number> = {
  // Pre-screening / Screening visits
  'screening': 1,
  'screening visit': 1,
  
  // Pre-procedure / Procedure (comes right after screening)
  'pre-procedure': 2,
  'pre-procedure/procedure': 2,
  'procedure': 2,
  'procedure visit': 2,
  
  // Discharge (comes right after pre-procedure/procedure)
  'discharge': 3,
  'discharge visit': 3,
  
  // Baseline
  'baseline': 4,
  'baseline visit': 4,
  'day 0': 5,
  
  // Day-based visits
  '7 day': 10,
  '7 day visit': 10,
  '7-day': 10,
  '14 day': 20,
  '14 day visit': 20,
  '14-day': 20,
  '30 day': 30,
  '30 day visit': 30,
  '30-day': 30,
  '60 day': 60,
  '60 day visit': 60,
  '60-day': 60,
  '90 day': 90,
  '90 day visit': 90,
  '90-day': 90,
  '180 day': 180,
  '180 day visit': 180,
  '180-day': 180,
  
  // Year-based visits
  '1 year': 365,
  '1 year visit': 365,
  '1-year': 365,
  '2 year': 730,
  '2 year visit': 730,
  '2-year': 730,
  
  // Other / unscheduled visits (always last)
  'other': 9998,
  'other visit': 9998,
  'unscheduled': 9997,
  'unscheduled visit': 9997,
};

/**
 * Get the sort order for a visit name
 * Extracts numbers if present, otherwise uses lookup table
 */
export function getVisitOrder(visitName: string | undefined): number {
  if (!visitName) return 9999;
  
  const normalized = visitName.toLowerCase().trim();
  
  // Check lookup table first
  if (VISIT_ORDER_MAP[normalized] !== undefined) {
    return VISIT_ORDER_MAP[normalized];
  }
  
  // Try to extract a number from the visit name
  const numberMatch = normalized.match(/(\d+)/);
  if (numberMatch) {
    const num = parseInt(numberMatch[1], 10);
    
    // Check if it's in days, weeks, months, or years
    if (normalized.includes('year')) {
      return num * 365;
    } else if (normalized.includes('month')) {
      return num * 30;
    } else if (normalized.includes('week')) {
      return num * 7;
    } else {
      // Assume days
      return num;
    }
  }
  
  // Default: return a large number to sort at end
  return 9999;
}

/**
 * Sort visit names in chronological order
 */
export function sortVisits(visits: string[]): string[] {
  return [...visits].sort((a, b) => getVisitOrder(a) - getVisitOrder(b));
}

/**
 * Field labels for displaying in change tooltips
 */
const FIELD_LABELS: Record<string, string> = {
  dose: 'Dose',
  unit: 'Unit',
  frequency: 'Frequency',
  startDate: 'Start Date',
  startDateUnknown: 'Start Date Unknown',
  stopDate: 'Stop Date',
  status: 'Status',
};

/**
 * Result of change status calculation
 */
export interface ChangeStatusResult {
  status: 'Yes' | 'No' | '-';
  changedFields: FieldChange[];
}

/**
 * Calculate change status by comparing current visit data to previous visit
 * Returns:
 * - status: '-' if no previous visit, 'Yes' if any field differs, 'No' if all same
 * - changedFields: Array of fields that changed with their previous and current values
 */
export function calculateChangeStatus(
  current: Omit<VisitData, 'changeStatus' | 'changedFields'>,
  previous: Omit<VisitData, 'changeStatus' | 'changedFields'> | null
): ChangeStatusResult {
  if (!previous) {
    return { status: '-', changedFields: [] }; // First visit, no comparison
  }
  
  // Fields to compare (excluding medication name since we're grouping by it)
  const compareFields: (keyof Omit<VisitData, 'changeStatus' | 'changedFields' | 'medicationName'>)[] = [
    'dose',
    'unit',
    'frequency',
    'startDate',
    'stopDate',
    'status',
  ];
  
  const changedFields: FieldChange[] = [];
  
  for (const field of compareFields) {
    const currentVal = (current[field] || '').trim();
    const previousVal = (previous[field] || '').trim();
    
    if (currentVal !== previousVal) {
      changedFields.push({
        field,
        fieldLabel: FIELD_LABELS[field] || field,
        previousValue: previousVal || '(empty)',
        currentValue: currentVal || '(empty)',
      });
    }
  }
  
  return {
    status: changedFields.length > 0 ? 'Yes' : 'No',
    changedFields,
  };
}

/**
 * Extract visit data from an MC record
 */
function extractVisitData(record: MCRecord): Omit<VisitData, 'changeStatus' | 'changedFields'> {
  return {
    medicationName: record['1.CCMED'] || '',
    dose: record['1.CC1'] || '',
    unit: record['1.CCUNIT'] || '',
    frequency: record['1.CCFREQ'] || '',
    startDate: record['1.CCSTDAT'] || '',
    startDateUnknown: record['1.CMSTDATUN1'] || '',
    stopDate: record['1.CCSPDAT'] || '',
    status: record['1.CCONGO1'] || '',
  };
}

/**
 * Create a unique key for grouping records by patient + medication
 */
function createGroupKey(subjectId: string, canonicalMedName: string): string {
  return `${subjectId}|||${canonicalMedName}`;
}

/**
 * Parse a group key back into its components
 */
function parseGroupKey(key: string): { subjectId: string; canonicalMedName: string } {
  const [subjectId, canonicalMedName] = key.split('|||');
  return { subjectId, canonicalMedName };
}

/**
 * Transform MC records into pivot table format
 * 
 * @param records Array of MC records from the database
 * @returns PivotResult with rows grouped by patient+medication and visits as columns
 */
export function transformToPivotData(records: MCRecord[]): PivotResult {
  if (records.length === 0) {
    return { rows: [], visitOrder: [], allVisits: [] };
  }
  
  // Step 1: Build medication name mapping for fuzzy matching
  const medicationNames = records.map(r => r['1.CCMED']);
  const medMapping = createMedicationMapping(medicationNames);
  
  // Step 2: Collect all unique visits
  const allVisitsSet = new Set<string>();
  for (const record of records) {
    const visit = record['1.CCSVT'];
    if (visit) {
      allVisitsSet.add(visit);
    }
  }
  const allVisits = Array.from(allVisitsSet);
  const visitOrder = sortVisits(allVisits);
  
  // Step 3: Group records by SubjectId + Canonical Medication Name
  const groups = new Map<string, { 
    siteName: string; 
    subjectId: string; 
    procedureDate: string;
    canonicalMedName: string;
    visitRecords: Map<string, MCRecord>;
  }>();
  
  for (const record of records) {
    const subjectId = record['SubjectId'] || '';
    const siteName = record['SiteName'] || '';
    const procedureDate = record['E02_V2[1].PRO_01.PEP[1].PEPDAT'] || '';
    const originalMedName = record['1.CCMED'] || '';
    const visit = record['1.CCSVT'] || '';
    
    if (!subjectId || !originalMedName || !visit) continue;
    
    const canonicalMedName = getCanonicalMedName(originalMedName, medMapping);
    const groupKey = createGroupKey(subjectId, canonicalMedName);
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        siteName,
        subjectId,
        procedureDate,
        canonicalMedName,
        visitRecords: new Map(),
      });
    }
    
    const group = groups.get(groupKey)!;
    
    // Update static fields if they were empty
    if (!group.siteName && siteName) group.siteName = siteName;
    if (!group.procedureDate && procedureDate) group.procedureDate = procedureDate;
    
    // Store the record for this visit (last one wins if duplicates)
    group.visitRecords.set(visit, record);
  }
  
  // Step 4: Build pivot rows with change detection
  const rows: PivotRow[] = [];
  
  for (const [, group] of groups) {
    const pivotRow: PivotRow = {
      siteName: group.siteName,
      subjectId: group.subjectId,
      procedureDate: group.procedureDate,
      canonicalMedName: group.canonicalMedName,
      visits: {},
    };
    
    let previousVisitData: Omit<VisitData, 'changeStatus' | 'changedFields'> | null = null;
    
    // Process visits in chronological order
    for (const visit of visitOrder) {
      const record = group.visitRecords.get(visit);
      
      if (record) {
        const visitData = extractVisitData(record);
        const changeResult = calculateChangeStatus(visitData, previousVisitData);
        
        pivotRow.visits[visit] = {
          ...visitData,
          changeStatus: changeResult.status,
          changedFields: changeResult.changedFields,
        };
        
        previousVisitData = visitData;
      } else {
        // No data for this visit - empty cells
        pivotRow.visits[visit] = {
          medicationName: '',
          dose: '',
          unit: '',
          frequency: '',
          startDate: '',
          startDateUnknown: '',
          stopDate: '',
          status: '',
          changeStatus: '-',
          changedFields: [],
        };
      }
    }
    
    rows.push(pivotRow);
  }
  
  // Step 5: Sort rows by SubjectId, then by Medication Name
  rows.sort((a, b) => {
    const subjectCompare = a.subjectId.localeCompare(b.subjectId);
    if (subjectCompare !== 0) return subjectCompare;
    return a.canonicalMedName.localeCompare(b.canonicalMedName);
  });
  
  return { rows, visitOrder, allVisits };
}

/**
 * Column definition for the pivot table
 */
export interface PivotColumnDef {
  id: string;
  header: string;
  visitName?: string; // If this column belongs to a visit
  field?: keyof VisitData | 'siteName' | 'subjectId' | 'procedureDate' | 'canonicalMedName';
  isStatic?: boolean;
}

/**
 * Generate column definitions for the pivot table
 */
export function generatePivotColumns(visitOrder: string[]): PivotColumnDef[] {
  const columns: PivotColumnDef[] = [];
  
  // Static columns
  columns.push({ id: 'siteName', header: 'Site Name', field: 'siteName', isStatic: true });
  columns.push({ id: 'subjectId', header: 'Patient ID', field: 'subjectId', isStatic: true });
  columns.push({ id: 'procedureDate', header: 'Procedure Date', field: 'procedureDate', isStatic: true });
  
  // Per-visit columns
  const visitFields: { field: keyof VisitData; header: string }[] = [
    { field: 'medicationName', header: 'Medication Name' },
    { field: 'dose', header: 'Dose' },
    { field: 'unit', header: 'Unit' },
    { field: 'frequency', header: 'Frequency' },
    { field: 'startDate', header: 'Start Date' },
    { field: 'startDateUnknown', header: 'Start Date Unknown' },
    { field: 'stopDate', header: 'Stop Date' },
    { field: 'status', header: 'Status' },
    { field: 'changeStatus', header: 'Change Status' },
  ];
  
  for (const visit of visitOrder) {
    for (const { field, header } of visitFields) {
      columns.push({
        id: `${visit}__${field}`,
        header,
        visitName: visit,
        field,
      });
    }
  }
  
  return columns;
}

/**
 * Generate visit group spans for multi-level header
 */
export interface VisitGroupSpan {
  visitGroup: string;
  startIndex: number;
  columnCount: number;
}

export function generateVisitGroupSpans(visitOrder: string[]): VisitGroupSpan[] {
  const spans: VisitGroupSpan[] = [];
  const STATIC_COLUMN_COUNT = 3; // siteName, subjectId, procedureDate
  const FIELDS_PER_VISIT = 9; // 9 fields per visit
  
  // Static columns group (empty label)
  spans.push({
    visitGroup: '', // Empty for static columns
    startIndex: 0,
    columnCount: STATIC_COLUMN_COUNT,
  });
  
  // Visit groups
  let currentIndex = STATIC_COLUMN_COUNT;
  for (const visit of visitOrder) {
    spans.push({
      visitGroup: visit,
      startIndex: currentIndex,
      columnCount: FIELDS_PER_VISIT,
    });
    currentIndex += FIELDS_PER_VISIT;
  }
  
  return spans;
}
