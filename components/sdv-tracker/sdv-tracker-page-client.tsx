"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Download, RefreshCw } from "lucide-react";
import { SDVFileUploadDialog } from "./sdv-file-upload-dialog";
import { SDVHierarchicalTable } from "./sdv-hierarchical-table";
import { SDVFilters } from "./sdv-filters";
import { SDVKPICards } from "./sdv-kpi-cards";
import { SDVHeaderRelabelModal } from "./sdv-header-relabel-modal";
import { SDVUploadHistory } from "./sdv-upload-history";
import { SDVUploadProgress } from "./sdv-upload-progress";
import { useToast } from "@/hooks/use-toast";
import { 
  getSDVHeaderMappings, 
  saveSDVHeaderMappings,
  getSDVUploads,
  getSDVSiteSummary,
  getSDVSiteDetails,
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
  // Upload management
  const [uploads, setUploads] = useState<Tables<'sdv_uploads'>[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  
  // Data state - Tree data with lazy loading
  const [hierarchy, setHierarchy] = useState<HierarchyNode[]>([]);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [siteDataCache, setSiteDataCache] = useState<Map<string, any[]>>(new Map());
  const [loadingSites, setLoadingSites] = useState<Set<string>>(new Set());
  const [aggregations, setAggregations] = useState<SDVAggregations | null>(null);
  
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
  useEffect(() => {
    if (selectedUploadId) {
      loadData(selectedUploadId);
    }
  }, [selectedUploadId, filters]);

  // Load filter options and aggregations when upload is selected
  useEffect(() => {
    if (selectedUploadId) {
      loadFilterOptions(selectedUploadId);
      loadAggregations(selectedUploadId);
    }
  }, [selectedUploadId]);

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

  // Handle site expand/collapse with lazy loading
  const handleSiteToggle = async (siteName: string) => {
    console.log('[SDV] handleSiteToggle called for:', siteName);
    const newExpanded = new Set(expandedSites);
    
    if (expandedSites.has(siteName)) {
      // Collapse
      console.log('[SDV] Collapsing site:', siteName);
      newExpanded.delete(siteName);
      setExpandedSites(newExpanded);
      
      // Update hierarchy to collapse this site
      setHierarchy(prevHierarchy => 
        prevHierarchy.map(node => 
          node.site_name === siteName 
            ? { ...node, isCollapsed: true }
            : node
        )
      );
    } else {
      // Expand - check if we need to load data
      console.log('[SDV] Expanding site:', siteName, 'Cached:', siteDataCache.has(siteName));
      
      if (!siteDataCache.has(siteName) && selectedUploadId) {
        // Show loading state
        console.log('[SDV] Fetching site details for:', siteName);
        const newLoadingSites = new Set(loadingSites);
        newLoadingSites.add(siteName);
        setLoadingSites(newLoadingSites);
        
        // Prepare active filters
        const activeFilters: SDVFiltersType = {};
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value.trim() !== '' && value.toLowerCase() !== 'all') {
            activeFilters[key as keyof SDVFiltersType] = value;
          }
        });
        
        // Fetch site details
        const result = await getSDVSiteDetails(selectedUploadId, siteName, activeFilters);
        
        newLoadingSites.delete(siteName);
        setLoadingSites(newLoadingSites);
        
        if (result.success && result.data) {
          console.log('[SDV] Fetched', result.data.records.length, 'records for', siteName);
          
          // Cache the data
          const newCache = new Map(siteDataCache);
          newCache.set(siteName, result.data.records);
          setSiteDataCache(newCache);
          
          // Build hierarchy for this site
          const siteHierarchy = createHierarchy(result.data.records as any);
          console.log('[SDV] Created hierarchy:', siteHierarchy);
          
          // Update hierarchy to expand and add children
          setHierarchy(prevHierarchy => 
            prevHierarchy.map(node => 
              node.site_name === siteName 
                ? { ...node, children: siteHierarchy[0]?.children || [], isCollapsed: false }
                : node
            )
          );
        } else {
          console.error('[SDV] Error fetching site details:', result.error);
          toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
          });
          return;
        }
      } else {
        // Data already cached, just expand
        console.log('[SDV] Using cached data for:', siteName);
        const cachedData = siteDataCache.get(siteName);
        if (cachedData) {
          const siteHierarchy = createHierarchy(cachedData as any);
          setHierarchy(prevHierarchy => 
            prevHierarchy.map(node => 
              node.site_name === siteName 
                ? { ...node, children: siteHierarchy[0]?.children || [], isCollapsed: false }
                : node
            )
          );
        }
      }
      
      newExpanded.add(siteName);
      setExpandedSites(newExpanded);
    }
  };

  const loadFilterOptions = async (uploadId: string) => {
    const result = await getSDVFilterOptions(uploadId);
    if (result.success && result.data) {
      setFilterOptions(result.data);
    }
  };

  const loadAggregations = async (uploadId: string) => {
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
            className="text-[11px] h-8"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={hierarchy.length === 0}
            className="text-[11px] h-8"
          >
            <Printer className="h-3 w-3 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={hierarchy.length === 0}
            className="text-[11px] h-8"
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
        onComplete={async () => {
          // Refresh data when background upload completes
          await loadUploads();
          if (selectedUploadId) {
            await loadData(selectedUploadId);
            await loadAggregations(selectedUploadId);
          }
        }}
      />
    </div>
  );
}
