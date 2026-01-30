"use client";

import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Download, RefreshCw } from "lucide-react";
import { SDVFileUploadDialog } from "./sdv-file-upload-dialog";
import { SDVHierarchicalTable, NodeToggleInfo } from "./sdv-hierarchical-table";
import { SDVFilters } from "./sdv-filters";
import { SDVKPICards } from "./sdv-kpi-cards";
import { SDVHeaderRelabelModal } from "./sdv-header-relabel-modal";
import { SDVCalculationSettingsModal } from "./sdv-calculation-settings-modal";
import { SDVUploadHistory } from "./sdv-upload-history";
import { SDVUploadProgress } from "./sdv-upload-progress";
import { useToast } from "@/hooks/use-toast";
import {
  useSDVAggregations,
  useSDVFilterOptions,
  sdvQueryKeys,
} from "@/hooks/use-sdv-data";
import { 
  getSDVHeaderMappings, 
  saveSDVHeaderMappings,
  getSDVUploads,
  getSDVSiteSummary,
  getSDVSiteDetails,
  getSDVSubjectDetails,
  getSDVVisitDetails,
  getSDVCRFDetails,
  deleteSDVUpload,
  getSDVAggregations,
  getSDVFilterOptions,
  regenerateMergedRecords,
  SDVAggregations,
  SDVFilters as SDVFiltersType,
} from "@/lib/actions/sdv-tracker-data";
import { Tables } from "@/lib/types/database.types";
import { createHierarchy, HierarchyNode } from "@/lib/utils/sdv-hierarchy";

interface SDVTrackerPageClientProps {
  companyId: string;
  profileId: string;
}

export function SDVTrackerPageClient({ companyId, profileId }: SDVTrackerPageClientProps) {
  const queryClient = useQueryClient();
  
  // Upload management
  const [uploads, setUploads] = useState<Tables<'sdv_uploads'>[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  
  // Data state - Tree data with multi-level lazy loading
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [nodeDataCache, setNodeDataCache] = useState<Map<string, any[]>>(new Map());
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [aggregations, setAggregations] = useState<SDVAggregations | null>(null);
  
  // Legacy state for backward compatibility
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [siteDataCache, setSiteDataCache] = useState<Map<string, any[]>>(new Map());
  const [loadingSites, setLoadingSites] = useState<Set<string>>(new Set());
  
  const [filterOptions, setFilterOptions] = useState<{
    siteNames: string[];
    subjectIds: string[];
    visitTypes: string[];
    crfNames: string[];
  } | null>(null);
  const [headerMappings, setHeaderMappings] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<SDVFiltersType>({
    siteName: "",
    subjectId: "",
    visitType: "",
    crfName: "",
    country: "",
    clinicalMonitor: "",
  });

  // Default header labels
  const defaultHeaderLabels: Record<string, string> = {
    "site_number": "Site #",
    "site_name": "Site Name",
    "subject_id": "Subject ID",
    "visit_type": "Visit Type",
    "crf_name": "CRF Name",
    "crf_field": "CRF Field",
    "sdv_percent": "SDV%",
    "data_verified": "Data Verified",
    "data_needing_review": "Data Needing Review",
    "data_expected": "Data Expected",
    "data_entered": "Data Entered",
    "opened_queries": "Opened Queries",
    "answered_queries": "Answered Queries",
    "estimate_hours": "Estimate Hours",
    "estimate_days": "Estimate Days",
  };

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const { toast } = useToast();

  // Load header mappings and uploads on mount
  useEffect(() => {
    if (companyId) {
      loadHeaderMappings();
      loadUploads();
    }
  }, [companyId]);

  // Load data when upload is selected or filters change
  // Run all initial data loads in parallel for better performance
  useEffect(() => {
    if (selectedUploadId) {
      // Execute all three API calls in parallel
      Promise.all([
        loadData(selectedUploadId),
        loadFilterOptions(selectedUploadId),
        loadAggregations(selectedUploadId)
      ]).catch(error => {
        console.error('Error loading initial data:', error);
      });
    }
  }, [selectedUploadId, filters]);

  // Reload aggregations when filters change (with debouncing)
  useEffect(() => {
    if (selectedUploadId) {
      const timeoutId = setTimeout(() => {
        loadAggregations(selectedUploadId);
      }, 300); // Debounce 300ms

      return () => clearTimeout(timeoutId);
    }
  }, [filters]);

  const loadHeaderMappings = async () => {
    const result = await getSDVHeaderMappings(companyId);
    if (result.success && result.data) {
      const mappings: Record<string, string> = {};
      result.data.forEach(mapping => {
        mappings[mapping.original_header] = mapping.customized_header;
      });
      setHeaderMappings({ ...defaultHeaderLabels, ...mappings });
    } else {
      setHeaderMappings(defaultHeaderLabels);
    }
  };

  const loadUploads = async () => {
    setIsLoading(true);
    setLoadingMessage("Loading uploads...");
    
    const result = await getSDVUploads(companyId);
    if (result.success && result.data) {
      setUploads(result.data);
      
      if (result.data.length > 0 && !selectedUploadId) {
        setSelectedUploadId(result.data[0].id);
      }
    } else if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
    setLoadingMessage("");
  };

  const loadData = async (uploadId: string) => {
    setIsLoading(true);
    
    // Prepare active filters (only non-empty values)
    const activeFilters: SDVFiltersType = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.trim() !== '' && value.toLowerCase() !== 'all') {
        activeFilters[key as keyof SDVFiltersType] = value;
      }
    });
    
    // Load site-level summary (fast - only 3 rows)
    setLoadingMessage("Loading site summary...");
    const sitesResult = await getSDVSiteSummary(uploadId, activeFilters);
    
    if (sitesResult.success && sitesResult.data) {
      // Convert site summary to collapsed hierarchy nodes
      const siteNodes: HierarchyNode[] = sitesResult.data.sites.map((site: any) => ({
        level: 'site',
        key: `site-${site.site_name}`,
        site_name: site.site_name,
        subject_id: null,
        visit_type: null,
        crf_name: null,
        crf_field: null,
        data_verified: site.data_verified || 0,
        data_entered: site.data_entered || 0,
        data_needing_review: site.data_needing_review || 0,
        data_expected: site.data_expected || 0,
        sdv_percent: site.sdv_percent || 0,
        estimate_hours: site.estimate_hours || 0,
        estimate_days: site.estimate_days || 0,
        children: [], // Empty initially - will be loaded on expand
        isCollapsed: true,
        hasLazyChildren: true, // Flag to show expand button even though children is empty
      }));
      
      setHierarchy(siteNodes);
    } else {
      toast({
        title: "Error",
        description: sitesResult.error,
        variant: "destructive",
      });
      setHierarchy([]);
    }
    
    setIsLoading(false);
    setLoadingMessage("");
  };

  // Handle multi-level node expand/collapse with lazy loading
  const handleNodeToggle = async (info: NodeToggleInfo) => {
    console.log('[SDV] handleNodeToggle called:', info);
    const { level, nodeId, siteName, subjectId, visitType, crfName } = info;
    
    const isExpanded = expandedNodes.has(nodeId);
    
    if (isExpanded) {
      // Collapse - just update state
      console.log('[SDV] Collapsing node:', nodeId);
      const newExpanded = new Set(expandedNodes);
      newExpanded.delete(nodeId);
      setExpandedNodes(newExpanded);
      
      // Update hierarchy to collapse this node
      updateNodeInHierarchy(nodeId, { isCollapsed: true });
    } else {
      // Expand - check if we need to load data
      const cacheKey = nodeId;
      console.log('[SDV] Expanding node:', nodeId, 'Cached:', nodeDataCache.has(cacheKey));
      
      // Check React Query cache first
      let queryKey;
      switch (level) {
        case 'site':
          queryKey = sdvQueryKeys.siteDetails(selectedUploadId!, siteName, filters);
          break;
        case 'subject':
          queryKey = sdvQueryKeys.subjectDetails(selectedUploadId!, siteName, subjectId!, filters);
          break;
        case 'visit':
          queryKey = sdvQueryKeys.visitDetails(selectedUploadId!, siteName, subjectId!, visitType!, filters);
          break;
        case 'crf':
          queryKey = sdvQueryKeys.crfDetails(selectedUploadId!, siteName, subjectId!, visitType!, crfName!, filters);
          break;
      }
      
      const cachedQuery = queryKey ? queryClient.getQueryData(queryKey) : null;
      
      if (!nodeDataCache.has(cacheKey) && !cachedQuery && selectedUploadId) {
        // Show loading state
        const newLoadingNodes = new Set(loadingNodes);
        newLoadingNodes.add(nodeId);
        setLoadingNodes(newLoadingNodes);
        
        // Prepare active filters
        const activeFilters: SDVFiltersType = {};
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value.trim() !== '' && value.toLowerCase() !== 'all') {
            activeFilters[key as keyof SDVFiltersType] = value;
          }
        });
        
        let result;
        
        // Fetch data based on level
        switch (level) {
          case 'site':
            // Fetch subject-level summaries for this site
            result = await getSDVSiteDetails(selectedUploadId, siteName, activeFilters);
            
            // Prefetch first 3 subjects in parallel
            if (result.success && result.data?.records) {
              const subjectsToPrefetch = result.data.records.slice(0, 3);
              subjectsToPrefetch.forEach((subject: any) => {
                const prefetchKey = sdvQueryKeys.subjectDetails(selectedUploadId, siteName, subject.subject_id, activeFilters);
                queryClient.prefetchQuery({
                  queryKey: prefetchKey,
                  queryFn: () => getSDVSubjectDetails(selectedUploadId, siteName, subject.subject_id, activeFilters),
                  staleTime: 5 * 60 * 1000,
                });
              });
            }
            break;
          case 'subject':
            // Fetch visit-level summaries for this subject
            result = await getSDVSubjectDetails(selectedUploadId, siteName, subjectId!, activeFilters);
            
            // Prefetch first 3 visits in parallel
            if (result.success && result.data?.records) {
              const visitsToPrefetch = result.data.records.slice(0, 3);
              visitsToPrefetch.forEach((visit: any) => {
                const prefetchKey = sdvQueryKeys.visitDetails(selectedUploadId, siteName, subjectId!, visit.visit_type, activeFilters);
                queryClient.prefetchQuery({
                  queryKey: prefetchKey,
                  queryFn: () => getSDVVisitDetails(selectedUploadId, siteName, subjectId!, visit.visit_type, activeFilters),
                  staleTime: 5 * 60 * 1000,
                });
              });
            }
            break;
          case 'visit':
            // Fetch CRF-level summaries for this visit
            result = await getSDVVisitDetails(selectedUploadId, siteName, subjectId!, visitType!, activeFilters);
            
            // Prefetch first 3 CRFs in parallel
            if (result.success && result.data?.records) {
              const crfsToPrefetch = result.data.records.slice(0, 3);
              crfsToPrefetch.forEach((crf: any) => {
                const prefetchKey = sdvQueryKeys.crfDetails(selectedUploadId, siteName, subjectId!, visitType!, crf.crf_name, activeFilters);
                queryClient.prefetchQuery({
                  queryKey: prefetchKey,
                  queryFn: () => getSDVCRFDetails(selectedUploadId, siteName, subjectId!, visitType!, crf.crf_name),
                  staleTime: 5 * 60 * 1000,
                });
              });
            }
            break;
          case 'crf':
            // Fetch field-level details for this CRF
            result = await getSDVCRFDetails(selectedUploadId, siteName, subjectId!, visitType!, crfName!);
            break;
          default:
            result = { success: false, error: 'Unknown level' };
        }
        
        // Clear loading state
        newLoadingNodes.delete(nodeId);
        setLoadingNodes(new Set(newLoadingNodes));
        
        if (result.success && result.data) {
          console.log('[SDV] Fetched', result.data.records.length, 'children for', nodeId);
          
          // Cache in React Query
          if (queryKey) {
            queryClient.setQueryData(queryKey, result.data);
          }
          
          // Cache the data
          const newCache = new Map(nodeDataCache);
          newCache.set(cacheKey, result.data.records);
          setNodeDataCache(newCache);
          
          // Convert records to child nodes
          const childNodes = convertRecordsToNodes(result.data.records, level);
          
          // Update hierarchy with children
          updateNodeInHierarchy(nodeId, { 
            children: childNodes, 
            isCollapsed: false 
          });
        } else {
          console.error('[SDV] Error fetching node details:', result.error);
          toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
          });
          return;
        }
      } else {
        // Data already cached, rebuild children and expand
        console.log('[SDV] Using cached data for:', nodeId);
        
        const cachedData = (cachedQuery && typeof cachedQuery === 'object' && 'records' in cachedQuery 
          ? (cachedQuery as { records: any[] }).records 
          : null) || nodeDataCache.get(cacheKey);
        if (cachedData) {
          const childNodes = convertRecordsToNodes(cachedData, level);
          updateNodeInHierarchy(nodeId, { 
            children: childNodes, 
            isCollapsed: false 
          });
        }
      }
      
      const newExpanded = new Set(expandedNodes);
      newExpanded.add(nodeId);
      setExpandedNodes(newExpanded);
    }
  };

  // Convert fetched records to hierarchy nodes
  const convertRecordsToNodes = (records: any[], parentLevel: string): HierarchyNode[] => {
    const childLevel = getChildLevel(parentLevel);
    
    return records.map((record, index) => {
      const nodeId = generateNodeId(childLevel, record);
      const hasChildren = record._hasChildren !== false && childLevel !== 'field';
      
      return {
        id: nodeId,
        level: childLevel as HierarchyNode['level'],
        site_name: record.site_name,
        subject_id: record.subject_id,
        visit_type: record.visit_type,
        crf_name: record.crf_name,
        crf_field: record.crf_field,
        data_verified: record.data_verified || 0,
        data_entered: record.data_entered || 0,
        data_needing_review: record.data_needing_review || 0,
        data_expected: record.data_expected || 0,
        sdv_percent: record.sdv_percent || 0,
        estimate_hours: record.estimate_hours || 0,
        estimate_days: record.estimate_days || 0,
        children: [],
        isCollapsed: true,
        hasLazyChildren: hasChildren,
      };
    });
  };

  // Get the child level for a parent level
  const getChildLevel = (parentLevel: string): string => {
    switch (parentLevel) {
      case 'site': return 'subject';
      case 'subject': return 'visit';
      case 'visit': return 'crf';
      case 'crf': return 'field';
      default: return 'field';
    }
  };

  // Generate a unique node ID
  const generateNodeId = (level: string, record: any): string => {
    switch (level) {
      case 'subject':
        return `subject-${record.site_name}-${record.subject_id}`;
      case 'visit':
        return `visit-${record.site_name}-${record.subject_id}-${record.visit_type}`;
      case 'crf':
        return `crf-${record.site_name}-${record.subject_id}-${record.visit_type}-${record.crf_name}`;
      case 'field':
        return `field-${record.site_name}-${record.subject_id}-${record.visit_type}-${record.crf_name}-${record.crf_field}`;
      default:
        return `node-${Date.now()}-${Math.random()}`;
    }
  };

  // Update a node in the hierarchy (recursive helper)
  const updateNodeInHierarchy = (nodeId: string, updates: Partial<HierarchyNode>) => {
    setHierarchy(prevHierarchy => {
      const updateNode = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => {
          const currentId = node.id || node.key;
          if (currentId === nodeId) {
            return { ...node, ...updates };
          }
          if (node.children && node.children.length > 0) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      return updateNode(prevHierarchy);
    });
  };

  // Collapse all nodes in the hierarchy
  const handleCollapseAll = () => {
    // Clear expanded nodes state
    setExpandedNodes(new Set());
    
    // Recursively collapse all nodes in hierarchy
    setHierarchy(prevHierarchy => {
      const collapseNodes = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => ({
          ...node,
          isCollapsed: true,
          children: node.children && node.children.length > 0 
            ? collapseNodes(node.children) 
            : node.children
        }));
      };
      return collapseNodes(prevHierarchy);
    });
  };

  // Legacy handler for backward compatibility
  const handleSiteToggle = async (siteName: string) => {
    // Find the site node and call handleNodeToggle
    const siteNode = hierarchy.find(n => n.site_name === siteName);
    if (siteNode) {
      handleNodeToggle({
        level: 'site',
        nodeId: siteNode.id || siteNode.key || `site-${siteName}`,
        siteName,
      });
    }
  };

  const loadFilterOptions = async (uploadId: string) => {
    const result = await getSDVFilterOptions(uploadId);
    if (result.success && result.data) {
      setFilterOptions(result.data);
    }
  };

  const loadAggregations = async (uploadId: string) => {
    try {
      // Fetch the latest upload status to check merge_status
      const supabase = await import('@/lib/client').then(m => m.createClient());
      const { data: uploadData, error: uploadError } = await supabase
        .from('sdv_uploads')
        .select('merge_status')
        .eq('id', uploadId)
        .single();
      
      if (uploadError) {
        console.error('[SDV Aggregations] Error fetching upload:', uploadError);
        return;
      }
      
      // Skip aggregations if upload is still being processed
      if (uploadData && uploadData.merge_status !== 'completed') {
        console.log(`[SDV Aggregations] Skipping - upload merge_status is "${uploadData.merge_status}", waiting for "completed"`);
        return;
      }
      
      // Check if any filters are actually selected (not empty and not "all")
      const activeFilters: SDVFiltersType = {};
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim() !== '' && value.toLowerCase() !== 'all') {
          activeFilters[key as keyof SDVFiltersType] = value;
        }
      });
      
      const result = await getSDVAggregations(uploadId, activeFilters);
      if (result.success && result.data) {
        setAggregations(result.data);
      } else if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[SDV Aggregations] Unexpected error:', error);
    }
  };

  const handleSaveHeaderMappings = async (newMappings: Record<string, string>) => {
    const mappingsArray = Object.entries(newMappings).map(([original, customized], index) => ({
      originalHeader: original,
      customizedHeader: customized,
      tableOrder: index,
    }));

    const result = await saveSDVHeaderMappings(companyId, mappingsArray);
    if (result.success) {
      setHeaderMappings(newMappings);
    } else {
      throw new Error(result.error || "Failed to save mappings");
    }
  };

  // Handle when a background upload job is started
  const handleUploadStarted = useCallback((jobId: string) => {
    console.log(`Upload job started: ${jobId}`);
    // The SDVUploadProgress component will handle tracking and notifications
  }, []);

  const handleUploadSelect = (uploadId: string) => {
    setSelectedUploadId(uploadId);
    setFilters({
      siteName: "",
      subjectId: "",
      visitType: "",
      crfName: "",
      country: "",
      clinicalMonitor: "",
    });
  };

  const handleUploadDelete = async (uploadId: string) => {
    setIsLoading(true);
    setLoadingMessage("Deleting upload...");
    
    const result = await deleteSDVUpload(uploadId);
    
    if (result.success) {
      toast({
        title: "Upload Deleted",
        description: "The upload and all associated data have been deleted",
      });
      
      await loadUploads();
      
      if (selectedUploadId === uploadId) {
        setSelectedUploadId(null);
        setHierarchy([]);
      }
    } else {
      toast({
        title: "Delete Failed",
        description: result.error || "Failed to delete upload",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
    setLoadingMessage("");
  };

  const handleRefresh = async () => {
    if (selectedUploadId) {
      setIsLoading(true);
      setLoadingMessage("Regenerating merged data...");
      
      await regenerateMergedRecords(selectedUploadId, companyId);
      await loadData(selectedUploadId);
      await loadAggregations(selectedUploadId);
      
      toast({
        title: "Data Refreshed",
        description: "Merged data has been regenerated",
      });
      
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (hierarchy.length === 0) {
      toast({
        title: "No data to download",
        description: "Please upload data first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Flatten hierarchy to get all field-level rows
      const getAllFieldRows = (nodes: HierarchyNode[]): any[] => {
        const rows: any[] = [];
        for (const node of nodes) {
          if (node.level === 'field' && node.data) {
            rows.push(node.data);
          }
          if (node.children && node.children.length > 0) {
            rows.push(...getAllFieldRows(node.children));
          }
        }
        return rows;
      };

      const fieldRows = getAllFieldRows(hierarchy);
      
      if (fieldRows.length === 0) {
        toast({
          title: "No detailed data to download",
          description: "Please expand sites to load data",
          variant: "destructive",
        });
        return;
      }

      const headers = Object.keys(defaultHeaderLabels);
      const csvContent = [
        headers.map(h => headerMappings[h] || h).join(','),
        ...fieldRows.map(row => 
          headers.map(h => {
            const value = row[h as keyof typeof row] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `sdv_tracker_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download successful",
        description: `Downloaded ${fieldRows.length} records`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "An error occurred while downloading the data",
        variant: "destructive",
      });
    }
  };

  const handleResetAllFilters = () => {
    setFilters({
      siteName: "",
      subjectId: "",
      visitType: "",
      crfName: "",
      country: "",
      clinicalMonitor: "",
    });
  };

  // Get current report date
  const currentUpload = uploads.find(u => u.id === selectedUploadId);
  const reportDate = currentUpload ? new Date(currentUpload.created_at).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) : null;

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* Upload Control & History */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SDVFileUploadDialog 
            companyId={companyId}
            profileId={profileId}
            selectedUploadId={selectedUploadId}
            onUploadStarted={handleUploadStarted}
            onMergeComplete={async () => {
              // Refresh data after upload completes
              await loadUploads();
              if (selectedUploadId) {
                await loadData(selectedUploadId);
                await loadAggregations(selectedUploadId);
              }
            }}
          />
          <SDVHeaderRelabelModal 
            currentMappings={headerMappings}
            onSave={handleSaveHeaderMappings}
            disabled={!companyId}
          />
          <SDVCalculationSettingsModal 
            companyId={companyId}
            disabled={!companyId}
          />
          <SDVUploadHistory
            uploads={uploads}
            selectedUploadId={selectedUploadId}
            onUploadSelect={handleUploadSelect}
            onUploadDelete={handleUploadDelete}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={!selectedUploadId || hierarchy.length === 0}
            className="text-[11px] h-8 hover:bg-accent/80 hover:scale-[1.02] transition-all duration-150"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={hierarchy.length === 0}
            className="text-[11px] h-8 hover:bg-primary/10 hover:font-medium transition-all"
            title="Print the current view"
          >
            <Printer className="h-3 w-3 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={hierarchy.length === 0}
            className="text-[11px] h-8 hover:bg-primary/10 hover:font-medium transition-all"
            title="Download data as CSV file"
          >
            <Download className="h-3 w-3 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Filters */}
      <SDVFilters 
        filters={filters} 
        onFiltersChange={setFilters} 
        onResetAll={handleResetAllFilters}
        filterOptions={filterOptions}
      />

      {/* KPI Cards with Report Date */}
      {aggregations && (
        <SDVKPICards 
          metrics={aggregations}
          reportDate={reportDate}
        />
      )}
      
      {/* Show message when upload is processing */}
      {selectedUploadId && !aggregations && !isLoading && uploads.find(u => u.id === selectedUploadId)?.merge_status !== 'completed' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-6">
            <div className="text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
              <p className="text-sm font-medium text-blue-900">Processing Upload</p>
              <p className="text-xs text-blue-700 mt-1">
                Metrics will appear once all chunks are processed and merged
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {hierarchy.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                See More Data 
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                  ({hierarchy.length} {hierarchy.length === 1 ? 'site' : 'sites'})
                </span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <SDVHierarchicalTable 
              hierarchy={hierarchy}
              headerMappings={headerMappings}
              onNodeToggle={handleNodeToggle}
              loadingNodes={loadingNodes}
              onCollapseAll={handleCollapseAll}
              onSiteToggle={handleSiteToggle}
              loadingSites={loadingSites}
            />
          </CardContent>
        </Card>
      )}

      {hierarchy.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-[11px] text-muted-foreground">
              {uploads.length === 0 
                ? "Upload Site Data Entry and SDV Data files to get started"
                : "Select an upload from the history to view data"
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Background Upload Progress Indicator */}
      <SDVUploadProgress 
        companyId={companyId}
        onComplete={async (job) => {
          // Refresh data when background upload completes
          await loadUploads();
          
          // If this job created an upload, select it and load its data
          if (job.upload_id) {
            setSelectedUploadId(job.upload_id);
            await loadData(job.upload_id);
            // Aggregations will load automatically once merge_status is completed
            await loadAggregations(job.upload_id);
          } else if (selectedUploadId) {
            // Otherwise refresh the current upload
            await loadData(selectedUploadId);
            await loadAggregations(selectedUploadId);
          }
        }}
      />
    </div>
  );
}
