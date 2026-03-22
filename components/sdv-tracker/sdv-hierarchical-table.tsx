'use client';

import Link from 'next/link';
import React, { useState, useCallback, useEffect } from 'react';
import { ChevronRight, ChevronDown, Loader2, Building2, User, Calendar, FileText, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getSDVSubjectSummary,
  getSDVEventSummary,
  getSDVFormSummary,
  getSDVItemDetails,
  type SDVSiteSummary,
  type SDVSubjectSummary,
  type SDVEventSummary,
  type SDVFormSummary,
  type SDVItemDetail,
} from '@/lib/actions/sdv-tracker';

// Tree node types
type NodeLevel = 'site' | 'subject' | 'event' | 'form' | 'item';

interface TreeNode {
  id: string;
  level: NodeLevel;
  name: string;
  // Core metrics
  dataExpected: number;      // count where edit_reason = 'Initial Data Entry'
  verifiedItems: number;     // items with SDV date (Data Verified)
  needsReview: number;       // dataExpected - verifiedItems
  sdvPercent: number;
  // Estimates (1 min per item, 8 hours per day)
  estimateHours: number;     // needsReview / 60
  estimateDays: number;      // estimateHours / 8
  // Legacy/internal
  totalItems: number;
  dataSourceBreakdown?: {
    both: number;
    siteOnly: number;
  };
  // Context for fetching children
  siteName?: string;
  subjectId?: string;
  eventName?: string;
  formName?: string;
  // Item-level details
  itemDetail?: SDVItemDetail;
  // Tree state
  isExpanded: boolean;
  isLoading: boolean;
  children: TreeNode[];
  hasLoadedChildren: boolean;
}

interface SDVHierarchicalTableProps {
  reportId: string;
  siteSummary: SDVSiteSummary[];
  sourceFilter?: string;
  isLoading: boolean;
}

export function SDVHierarchicalTable({
  reportId,
  siteSummary,
  sourceFilter,
  isLoading,
}: SDVHierarchicalTableProps) {
  // Convert site summary to tree nodes
  const [nodes, setNodes] = useState<TreeNode[]>([]);

  // Helper to calculate estimate fields
  const calculateEstimates = (dataExpected: number, verifiedItems: number) => {
    const needsReview = Math.max(0, dataExpected - verifiedItems);
    const estimateHours = needsReview / 60; // 1 min per item
    const estimateDays = estimateHours / 8; // 8 hours per day
    return { needsReview, estimateHours, estimateDays };
  };

  // Update nodes when siteSummary changes
  useEffect(() => {
    setNodes(
      siteSummary.map((site) => {
        const dataExpected = Number(site.data_expected);
        const verifiedItems = Number(site.verified_items);
        const estimates = calculateEstimates(dataExpected, verifiedItems);
        
        return {
          id: `site-${site.site_name}`,
          level: 'site' as NodeLevel,
          name: site.site_name,
          dataExpected,
          verifiedItems,
          needsReview: estimates.needsReview,
          sdvPercent: Number(site.sdv_percent),
          estimateHours: estimates.estimateHours,
          estimateDays: estimates.estimateDays,
          totalItems: Number(site.total_items),
          dataSourceBreakdown: {
            both: Number(site.both_count),
            siteOnly: Number(site.site_data_only_count),
          },
          siteName: site.site_name,
          isExpanded: false,
          isLoading: false,
          children: [],
          hasLoadedChildren: false,
        };
      })
    );
  }, [siteSummary]);

  // Find and update a node in the tree
  const updateNode = useCallback((
    nodes: TreeNode[],
    nodeId: string,
    updater: (node: TreeNode) => TreeNode
  ): TreeNode[] => {
    return nodes.map((node) => {
      if (node.id === nodeId) {
        return updater(node);
      }
      if (node.children.length > 0) {
        return {
          ...node,
          children: updateNode(node.children, nodeId, updater),
        };
      }
      return node;
    });
  }, []);

  // Load children for a node (callers that expand the row should rely on this
  // to set isExpanded: true — avoid a separate isExpanded flip to prevent races
  // when loadChildren runs twice or overlaps with another toggle).
  const loadChildren = useCallback(async (node: TreeNode) => {
    if (node.hasLoadedChildren) return;

    setNodes((prev) =>
      updateNode(prev, node.id, (n) => ({ ...n, isLoading: true }))
    );

    let children: TreeNode[] = [];

    try {
      switch (node.level) {
        case 'site': {
          const subjects = await getSDVSubjectSummary(
            reportId,
            node.siteName!,
            sourceFilter
          );
          children = subjects.map((subject) => {
            const dataExpected = Number(subject.data_expected);
            const verifiedItems = Number(subject.verified_items);
            const estimates = calculateEstimates(dataExpected, verifiedItems);
            
            return {
              id: `subject-${node.siteName}-${subject.subject_id}`,
              level: 'subject' as NodeLevel,
              name: subject.subject_id,
              dataExpected,
              verifiedItems,
              needsReview: estimates.needsReview,
              sdvPercent: Number(subject.sdv_percent),
              estimateHours: estimates.estimateHours,
              estimateDays: estimates.estimateDays,
              totalItems: Number(subject.total_items),
              dataSourceBreakdown: {
                both: Number(subject.both_count),
                siteOnly: Number(subject.site_data_only_count),
              },
              siteName: node.siteName,
              subjectId: subject.subject_id,
              isExpanded: false,
              isLoading: false,
              children: [],
              hasLoadedChildren: false,
            };
          });
          break;
        }
        case 'subject': {
          const events = await getSDVEventSummary(
            reportId,
            node.siteName!,
            node.subjectId!,
            sourceFilter
          );
          children = events.map((event) => {
            const dataExpected = Number(event.data_expected);
            const verifiedItems = Number(event.verified_items);
            const estimates = calculateEstimates(dataExpected, verifiedItems);
            
            return {
              id: `event-${node.siteName}-${node.subjectId}-${event.event_name}`,
              level: 'event' as NodeLevel,
              name: event.event_name,
              dataExpected,
              verifiedItems,
              needsReview: estimates.needsReview,
              sdvPercent: Number(event.sdv_percent),
              estimateHours: estimates.estimateHours,
              estimateDays: estimates.estimateDays,
              totalItems: Number(event.total_items),
              dataSourceBreakdown: {
                both: Number(event.both_count),
                siteOnly: Number(event.site_data_only_count),
              },
              siteName: node.siteName,
              subjectId: node.subjectId,
              eventName: event.event_name,
              isExpanded: false,
              isLoading: false,
              children: [],
              hasLoadedChildren: false,
            };
          });
          break;
        }
        case 'event': {
          const forms = await getSDVFormSummary(
            reportId,
            node.siteName!,
            node.subjectId!,
            node.eventName!,
            sourceFilter
          );
          children = forms.map((form) => {
            const dataExpected = Number(form.data_expected);
            const verifiedItems = Number(form.verified_items);
            const estimates = calculateEstimates(dataExpected, verifiedItems);
            
            return {
              id: `form-${node.siteName}-${node.subjectId}-${node.eventName}-${form.form_name}`,
              level: 'form' as NodeLevel,
              name: form.form_name,
              dataExpected,
              verifiedItems,
              needsReview: estimates.needsReview,
              sdvPercent: Number(form.sdv_percent),
              estimateHours: estimates.estimateHours,
              estimateDays: estimates.estimateDays,
              totalItems: Number(form.total_items),
              dataSourceBreakdown: {
                both: Number(form.both_count),
                siteOnly: Number(form.site_data_only_count),
              },
              siteName: node.siteName,
              subjectId: node.subjectId,
              eventName: node.eventName,
              formName: form.form_name,
              isExpanded: false,
              isLoading: false,
              children: [],
              hasLoadedChildren: false,
            };
          });
          break;
        }
        case 'form': {
          const items = await getSDVItemDetails(
            reportId,
            node.siteName!,
            node.subjectId!,
            node.eventName!,
            node.formName!,
            sourceFilter
          );
          children = items.map((item, index) => {
            // For items: dataExpected is 1 if initial entry, 0 otherwise
            const dataExpected = item.is_initial_entry ? 1 : 0;
            const verifiedItems = item.is_verified ? 1 : 0;
            const estimates = calculateEstimates(dataExpected, verifiedItems);
            
            return {
              id: `item-${node.siteName}-${node.subjectId}-${node.eventName}-${node.formName}-${index}`,
              level: 'item' as NodeLevel,
              name: item.item_display,
              dataExpected,
              verifiedItems,
              needsReview: estimates.needsReview,
              sdvPercent: item.is_verified ? 100 : 0,
              estimateHours: estimates.estimateHours,
              estimateDays: estimates.estimateDays,
              totalItems: 1,
              siteName: node.siteName,
              subjectId: node.subjectId,
              eventName: node.eventName,
              formName: node.formName,
              itemDetail: item,
              isExpanded: false,
              isLoading: false,
              children: [],
              hasLoadedChildren: true,
            };
          });
          break;
        }
      }
    } catch (error) {
      console.error('Error loading children:', error);
    }

    setNodes((prev) =>
      updateNode(prev, node.id, (n) => ({
        ...n,
        isLoading: false,
        hasLoadedChildren: true,
        children,
        isExpanded: true,
      }))
    );
  }, [reportId, sourceFilter, updateNode]);

  // Toggle node expansion
  const toggleNode = useCallback(async (node: TreeNode) => {
    if (node.level === 'item') return; // Items can't be expanded
    if (node.isLoading) return;

    if (node.isExpanded) {
      setNodes((prev) =>
        updateNode(prev, node.id, (n) => ({ ...n, isExpanded: false }))
      );
      return;
    }

    if (!node.hasLoadedChildren) {
      await loadChildren(node);
      return;
    }

    setNodes((prev) =>
      updateNode(prev, node.id, (n) => ({ ...n, isExpanded: true }))
    );
  }, [loadChildren, updateNode]);

  // Get level icon
  const getLevelIcon = (level: NodeLevel) => {
    switch (level) {
      case 'site':
        return <Building2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
      case 'subject':
        return <User className="h-4 w-4 text-purple-500 dark:text-purple-400" />;
      case 'event':
        return <Calendar className="h-4 w-4 text-green-500 dark:text-green-400" />;
      case 'form':
        return <FileText className="h-4 w-4 text-orange-500 dark:text-orange-400" />;
      case 'item':
        return <FileCheck className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Get SDV percent color
  const getSDVPercentColor = (percent: number) => {
    if (percent >= 80) {
      return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40';
    }
    if (percent >= 50) {
      return 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40';
    }
    return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40';
  };

  // Render a tree row
  const renderRow = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const indent = depth * 24;
    const canExpand = node.level !== 'item';

    return (
      <React.Fragment key={node.id}>
        <TableRow
          className={`hover:bg-muted/50 ${node.level === 'item' ? 'bg-muted/20' : ''} ${canExpand && !node.isLoading ? 'cursor-pointer' : ''}`}
          onClick={
            canExpand && !node.isLoading
              ? () => {
                  void toggleNode(node);
                }
              : undefined
          }
        >
          {/* Name with expand/collapse */}
          <TableCell className="font-medium">
            <div
              className="flex items-center gap-2"
              style={{ paddingLeft: `${indent}px` }}
            >
              {canExpand && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    void toggleNode(node);
                  }}
                  disabled={node.isLoading}
                >
                  {node.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : node.isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              {!canExpand && <div className="w-6" />}
              {getLevelIcon(node.level)}
              <span className="truncate max-w-[200px]">{node.name}</span>
            </div>
          </TableCell>

          {/* Data Expected */}
          <TableCell className="text-right">
            {node.dataExpected.toLocaleString()}
          </TableCell>

          {/* Data Verified */}
          <TableCell className="text-right text-foreground">
            {node.verifiedItems.toLocaleString()}
          </TableCell>

          {/* Data Needing Review */}
          <TableCell className="text-right text-foreground">
            {node.needsReview.toLocaleString()}
          </TableCell>

          {/* SDV Percent */}
          <TableCell>
            <div className="flex items-center gap-2 justify-end">
              <span className={`text-sm font-medium px-1.5 py-0.5 rounded ${getSDVPercentColor(node.sdvPercent)}`}>
                {Math.round(node.sdvPercent)}%
              </span>
            </div>
          </TableCell>
        </TableRow>

        {/* Render children if expanded */}
        {node.isExpanded &&
          node.children.map((child) => renderRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading data...</span>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-8">
        <div className="text-center text-muted-foreground">
          <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No Data Available</p>
          <p className="text-sm mt-1">Upload CSV files to see the SDV report.</p>
          <p className="text-sm mt-2">
            <Link href="/protected/docs/sdv-tracker#2-getting-started" className="text-primary hover:underline">
              Learn how to get started
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[22%]">
              <div className="flex items-center gap-2">
                Name
                <span className="text-[10px] text-muted-foreground font-normal">
                  (Site → Subject → Event → Form → Item)
                </span>
              </div>
            </TableHead>
            <TableHead className="text-right w-[9%]">Site Data Entry</TableHead>
            <TableHead className="text-right w-[9%] text-foreground">Data Verified</TableHead>
            <TableHead className="text-right w-[9%] text-foreground">Needs Review</TableHead>
            <TableHead className="text-right w-[10%]">SDV %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {nodes.map((node) => renderRow(node))}
        </TableBody>
      </Table>
    </div>
  );
}
