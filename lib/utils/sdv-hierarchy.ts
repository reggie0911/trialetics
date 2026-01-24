// Utility functions for creating hierarchical SDV data structure

export interface SDVRow {
  site_name: string;
  subject_id: string;
  visit_type: string;
  crf_name: string;
  crf_field: string;
  sdv_percent: number;
  data_verified: number;
  data_entered: number;
  data_needing_review: number;
  data_expected: number;
  estimate_hours: number;
  estimate_days: number;
  [key: string]: any;
}

export interface HierarchyNode {
  id?: string;
  level: 'site' | 'subject' | 'visit' | 'crf' | 'field';
  key?: string;
  label?: string;
  // Aggregated values
  sdv_percent: number;
  data_verified: number;
  data_entered: number;
  data_needing_review: number;
  data_expected: number;
  estimate_hours: number;
  estimate_days: number;
  // Hierarchy
  children?: HierarchyNode[];
  isCollapsed?: boolean; // For lazy-loaded tree data
  hasLazyChildren?: boolean; // Flag to indicate children can be loaded lazily
  // Original data (only for field level)
  data?: SDVRow;
  // For rendering
  site_name?: string | null;
  subject_id?: string | null;
  visit_type?: string | null;
  crf_name?: string | null;
  crf_field?: string | null;
}

/**
 * Create a hierarchical structure from flat SDV data
 * Structure: Site > Subject > Visit > CRF Name > CRF Field
 */
export function createHierarchy(data: SDVRow[]): HierarchyNode[] {
  const siteMap = new Map<string, HierarchyNode>();
  let fieldIndex = 0; // Unique index for each field node

  // Group by site
  for (const row of data) {
    const siteName = row.site_name || 'Unknown Site';
    const subjectId = row.subject_id || 'Unknown Subject';
    const visitType = row.visit_type || 'Unknown Visit';
    const crfName = row.crf_name || 'Unknown CRF';
    const crfField = row.crf_field || 'Unknown Field';

    // Get or create site node
    if (!siteMap.has(siteName)) {
      siteMap.set(siteName, {
        id: `site-${siteName}`,
        level: 'site',
        label: siteName,
        site_name: siteName,
        sdv_percent: 0,
        data_verified: 0,
        data_entered: 0,
        data_needing_review: 0,
        data_expected: 0,
        estimate_hours: 0,
        estimate_days: 0,
        children: [],
      });
    }
    const siteNode = siteMap.get(siteName)!;

    // Get or create subject node
    let subjectNode = siteNode.children?.find(
      (c) => c.level === 'subject' && c.subject_id === subjectId
    );
    if (!subjectNode) {
      subjectNode = {
        id: `subject-${siteName}-${subjectId}`,
        level: 'subject',
        label: subjectId,
        site_name: siteName,
        subject_id: subjectId,
        sdv_percent: 0,
        data_verified: 0,
        data_entered: 0,
        data_needing_review: 0,
        data_expected: 0,
        estimate_hours: 0,
        estimate_days: 0,
        children: [],
      };
      siteNode.children!.push(subjectNode);
    }

    // Get or create visit node
    let visitNode = subjectNode.children?.find(
      (c) => c.level === 'visit' && c.visit_type === visitType
    );
    if (!visitNode) {
      visitNode = {
        id: `visit-${siteName}-${subjectId}-${visitType}`,
        level: 'visit',
        label: visitType,
        site_name: siteName,
        subject_id: subjectId,
        visit_type: visitType,
        sdv_percent: 0,
        data_verified: 0,
        data_entered: 0,
        data_needing_review: 0,
        data_expected: 0,
        estimate_hours: 0,
        estimate_days: 0,
        children: [],
      };
      subjectNode.children!.push(visitNode);
    }

    // Get or create CRF node
    let crfNode = visitNode.children?.find(
      (c) => c.level === 'crf' && c.crf_name === crfName
    );
    if (!crfNode) {
      crfNode = {
        id: `crf-${siteName}-${subjectId}-${visitType}-${crfName}`,
        level: 'crf',
        label: crfName,
        site_name: siteName,
        subject_id: subjectId,
        visit_type: visitType,
        crf_name: crfName,
        sdv_percent: 0,
        data_verified: 0,
        data_entered: 0,
        data_needing_review: 0,
        data_expected: 0,
        estimate_hours: 0,
        estimate_days: 0,
        children: [],
      };
      visitNode.children!.push(crfNode);
    }

    // Create field node (leaf) - use unique index to avoid duplicate keys
    fieldIndex++;
    const fieldNode: HierarchyNode = {
      id: `field-${fieldIndex}-${siteName}-${subjectId}-${visitType}-${crfName}-${crfField}`,
      level: 'field',
      label: crfField,
      site_name: siteName,
      subject_id: subjectId,
      visit_type: visitType,
      crf_name: crfName,
      crf_field: crfField,
      sdv_percent: row.sdv_percent || 0,
      data_verified: row.data_verified || 0,
      data_entered: row.data_entered || 0,
      data_needing_review: row.data_needing_review || 0,
      data_expected: row.data_expected || 0,
      estimate_hours: row.estimate_hours || 0,
      estimate_days: row.estimate_days || 0,
      data: row,
    };
    crfNode.children!.push(fieldNode);

    // Aggregate up the tree
    aggregateNode(crfNode);
    aggregateNode(visitNode);
    aggregateNode(subjectNode);
    aggregateNode(siteNode);
  }

  return Array.from(siteMap.values());
}

/**
 * Calculate aggregated values for a node based on its children
 */
function aggregateNode(node: HierarchyNode): void {
  if (!node.children || node.children.length === 0) {
    return;
  }

  let totalVerified = 0;
  let totalEntered = 0;
  let totalNeedingReview = 0;
  let totalExpected = 0;
  let totalEstimateHours = 0;
  let totalEstimateDays = 0;

  for (const child of node.children) {
    totalVerified += child.data_verified || 0;
    totalEntered += child.data_entered || 0;
    totalNeedingReview += child.data_needing_review || 0;
    totalExpected += child.data_expected || 0;
    totalEstimateHours += child.estimate_hours || 0;
    totalEstimateDays += child.estimate_days || 0;
  }

  node.data_verified = totalVerified;
  node.data_entered = totalEntered;
  node.data_needing_review = totalNeedingReview;
  node.data_expected = totalExpected;
  node.estimate_hours = Math.round(totalEstimateHours * 100) / 100;
  node.estimate_days = Math.round(totalEstimateDays * 100) / 100;

  // Calculate SDV percentage
  node.sdv_percent = totalEntered > 0 
    ? Math.round((totalVerified / totalEntered) * 100) 
    : 0;
}

/**
 * Flatten hierarchy back to an array for display
 * This allows us to render in a table while maintaining hierarchy info
 */
export function flattenHierarchy(
  nodes: HierarchyNode[],
  expandedIds: Set<string>,
  depth: number = 0
): Array<HierarchyNode & { depth: number; hasChildren: boolean; isExpanded: boolean }> {
  const result: Array<HierarchyNode & { depth: number; hasChildren: boolean; isExpanded: boolean }> = [];

  for (const node of nodes) {
    // Check if node has children OR can load children lazily
    const hasChildren = (node.children && node.children.length > 0) || node.hasLazyChildren === true;
    const nodeId = node.id || node.key || '';
    
    // For lazy-loaded tree data, check isCollapsed flag
    // Otherwise check expandedIds set
    const isExpanded = node.isCollapsed === false || expandedIds.has(nodeId);

    result.push({
      ...node,
      id: nodeId,
      depth,
      hasChildren,
      isExpanded,
    });

    // If expanded and has children, recursively flatten children
    if (isExpanded && hasChildren && node.children && node.children.length > 0) {
      result.push(...flattenHierarchy(node.children, expandedIds, depth + 1));
    }
  }

  return result;
}
