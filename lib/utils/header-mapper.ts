export interface HeaderMapping {
  tableOrder: number;
  visitGroup: string;
  originalHeader: string;
  customizedHeader: string;
}

export interface GroupedHeaders {
  [visitGroup: string]: HeaderMapping[];
}

export interface VisitGroupSpan {
  visitGroup: string;
  startIndex: number;
  columnCount: number;
}

/**
 * Parse the Polares header mapping CSV content (original vertical format)
 * @deprecated Use parseTransposedHeaderCSV for the new transposed format
 */
export function parseHeaderMappingCSV(csvContent: string): HeaderMapping[] {
  const lines = csvContent.trim().split('\n');
  const mappings: HeaderMapping[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handles quoted commas)
    const columns = parseCSVLine(line);
    
    if (columns.length >= 4) {
      mappings.push({
        tableOrder: parseInt(columns[0]) || 0,
        visitGroup: columns[1] || '',
        originalHeader: columns[2] || '',
        customizedHeader: columns[3] || '',
      });
    }
  }
  
  return mappings;
}

export interface VisitGroupSpanType {
  visitGroup: string;
  startIndex: number;
  columnCount: number;
}

/**
 * Parse the transposed header mapping CSV content
 * Row 1: Table Order (1, 2, 3, ...)
 * Row 2: Visit Group
 * Row 3: Original Header
 * Row 4: Customized Header
 */
export function parseTransposedHeaderCSV(csvContent: string): {
  mappings: HeaderMapping[];
  visitGroupSpans: VisitGroupSpan[];
} {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 4) {
    throw new Error('CSV must have at least 4 rows: Table Order, Visit Group, Original Header, Customized Header');
  }
  
  // Parse each row
  const tableOrderRow = parseCSVLine(lines[0]);
  const visitGroupRow = parseCSVLine(lines[1]);
  const originalHeaderRow = parseCSVLine(lines[2]);
  const customizedHeaderRow = parseCSVLine(lines[3]);
  
  // Skip first column (row labels)
  const tableOrders = tableOrderRow.slice(1);
  const visitGroups = visitGroupRow.slice(1);
  const originalHeaders = originalHeaderRow.slice(1);
  const customizedHeaders = customizedHeaderRow.slice(1);
  
  // Create mappings
  const mappings: HeaderMapping[] = [];
  for (let i = 0; i < tableOrders.length; i++) {
    if (originalHeaders[i] && customizedHeaders[i]) {
      mappings.push({
        tableOrder: parseInt(tableOrders[i]) || i + 1,
        visitGroup: visitGroups[i] || 'Other',
        originalHeader: originalHeaders[i],
        customizedHeader: customizedHeaders[i],
      });
    }
  }
  
  // Sort by table order
  mappings.sort((a, b) => a.tableOrder - b.tableOrder);
  
  // Calculate visit group spans
  const visitGroupSpans: VisitGroupSpan[] = [];
  let currentGroup = '';
  let startIndex = 0;
  let count = 0;
  
  mappings.forEach((mapping, index) => {
    if (mapping.visitGroup !== currentGroup) {
      // Save previous group if exists
      if (currentGroup && count > 0) {
        visitGroupSpans.push({
          visitGroup: currentGroup,
          startIndex,
          columnCount: count,
        });
      }
      // Start new group
      currentGroup = mapping.visitGroup;
      startIndex = index;
      count = 1;
    } else {
      count++;
    }
  });
  
  // Add last group
  if (currentGroup && count > 0) {
    visitGroupSpans.push({
      visitGroup: currentGroup,
      startIndex,
      columnCount: count,
    });
  }
  
  return { mappings, visitGroupSpans };
}

/**
 * Group headers by visit group
 */
export function groupHeadersByVisit(mappings: HeaderMapping[]): GroupedHeaders {
  const grouped: GroupedHeaders = {};
  
  mappings.forEach(mapping => {
    if (!mapping.visitGroup) return;
    
    if (!grouped[mapping.visitGroup]) {
      grouped[mapping.visitGroup] = [];
    }
    
    grouped[mapping.visitGroup].push(mapping);
  });
  
  return grouped;
}

/**
 * Create a lookup map from original header to customized header
 */
export function createHeaderLookup(mappings: HeaderMapping[]): Map<string, string> {
  const lookup = new Map<string, string>();
  
  mappings.forEach(mapping => {
    if (mapping.originalHeader && mapping.customizedHeader) {
      lookup.set(mapping.originalHeader, mapping.customizedHeader);
    }
  });
  
  return lookup;
}

/**
 * Get the visit group for a given column
 */
export function getVisitGroupForColumn(columnId: string, mappings: HeaderMapping[]): string {
  const mapping = mappings.find(m => m.originalHeader === columnId);
  return mapping?.visitGroup || 'Other';
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Get the order of visit groups
 */
export function getVisitGroupOrder(mappings: HeaderMapping[]): string[] {
  const groups = new Set<string>();
  const groupOrder = new Map<string, number>();
  
  mappings.forEach(mapping => {
    if (mapping.visitGroup && !groupOrder.has(mapping.visitGroup)) {
      groupOrder.set(mapping.visitGroup, mapping.tableOrder);
      groups.add(mapping.visitGroup);
    }
  });
  
  return Array.from(groups).sort((a, b) => {
    return (groupOrder.get(a) || 0) - (groupOrder.get(b) || 0);
  });
}
