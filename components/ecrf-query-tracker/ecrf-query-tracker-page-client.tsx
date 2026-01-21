"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Download } from "lucide-react";
import { ECRFCSVUploadDialog, ECRFRecord } from "./ecrf-csv-upload-dialog";
import { ECRFDataTable } from "./ecrf-data-table";
import { ECRFFilters } from "./ecrf-filters";
import { ECRFKPICards } from "./ecrf-kpi-cards";
import { ECRFCharts } from "./ecrf-charts";
import { ECRFHeaderRelabelModal } from "./ecrf-header-relabel-modal";
import { ECRFUploadHistory } from "./ecrf-upload-history";
import { useToast } from "@/hooks/use-toast";
import { 
  getECRFHeaderMappings, 
  saveECRFHeaderMappings,
  getECRFUploads,
  uploadECRFData,
  getECRFRecords,
  deleteECRFUpload,
  getECRFAggregations,
  getECRFFilterOptions,
  ECRFAggregations,
} from "@/lib/actions/ecrf-query-tracker-data";
import { ColumnFiltersState } from "@tanstack/react-table";
import { Tables } from "@/lib/types/database.types";

interface ECRFQueryTrackerPageClientProps {
  companyId: string;
  profileId: string;
}

export function ECRFQueryTrackerPageClient({ companyId, profileId }: ECRFQueryTrackerPageClientProps) {
  // Upload management
  const [uploads, setUploads] = useState<Tables<'ecrf_uploads'>[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  
  // Data state
  const [data, setData] = useState<ECRFRecord[]>([]);
  const [aggregations, setAggregations] = useState<ECRFAggregations | null>(null);
  const [filterOptions, setFilterOptions] = useState<{
    siteNames: string[];
    subjectIds: string[];
    eventNames: string[];
    formNames: string[];
    queryTypes: string[];
    queryStates: string[];
    userRoles: string[];
    queryRaisedByRoles: string[];
  } | null>(null);
  const [headerMappings, setHeaderMappings] = useState<Record<string, string>>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [filters, setFilters] = useState({
    siteName: "",
    subjectId: "",
    eventName: "",
    formName: "",
    queryType: "",
    queryState: "",
    userRole: "",
    queryRaisedByRole: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);

  // Default header labels
  const defaultHeaderLabels: Record<string, string> = {
    "SiteName": "Site Name",
    "SubjectId": "Subject ID",
    "EventName": "Event Name",
    "EventDate": "Event Date",
    "FormName": "Form Name",
    "QueryType": "Query Type",
    "QueryText": "Query Text",
    "QueryState": "Query State",
    "QueryResolution": "Query Resolution",
    "UserName": "User Name",
    "DateTime": "Date/Time",
    "UserRole": "User Role",
    "QueryRaisedByRole": "Query Raised By Role",
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

  // Load data when upload is selected, pagination changes, or filters change
  useEffect(() => {
    if (selectedUploadId) {
      loadData(selectedUploadId);
    }
  }, [selectedUploadId, currentPage, pageSize, filters]);

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

  // Update aggregations when totalRecords changes (for accurate Total Queries count)
  useEffect(() => {
    if (selectedUploadId && totalRecords > 0 && aggregations) {
      // Check if filters are active
      const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
        value && value.trim() !== '' && value.toLowerCase() !== 'all'
      );
      
      // Only update if no filters are active (to show true database total)
      if (!hasActiveFilters) {
        setAggregations({
          ...aggregations,
          totalQueries: totalRecords,
        });
      }
    }
  }, [totalRecords]);

  const loadHeaderMappings = async () => {
    const result = await getECRFHeaderMappings(companyId);
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
    
    const result = await getECRFUploads(companyId);
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
    const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / pageSize) : 1;
    setLoadingMessage(`Loading page ${currentPage} of ${totalPages}...`);
    
    // Prepare active filters (only non-empty values)
    const activeFilters: any = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.trim() !== '' && value.toLowerCase() !== 'all') {
        activeFilters[key] = value;
      }
    });
    
    // Load records with pagination and filters
    const result = await getECRFRecords(uploadId, currentPage, pageSize, activeFilters);
    if (result.success && result.data) {
      setData(result.data.records);
      setTotalRecords(result.data.total);
    } else if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      setData([]);
      setTotalRecords(0);
    }
    
    setIsLoading(false);
    setLoadingMessage("");
  };

  const loadFilterOptions = async (uploadId: string) => {
    const result = await getECRFFilterOptions(uploadId);
    if (result.success && result.data) {
      setFilterOptions(result.data);
    }
  };

  const loadAggregations = async (uploadId: string) => {
    // Check if any filters are actually selected (not empty and not "all")
    const activeFilters: any = {};
    let hasActiveFilters = false;
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.trim() !== '' && value.toLowerCase() !== 'all') {
        activeFilters[key] = value;
        hasActiveFilters = true;
      }
    });
    
    // If no filters are active, pass empty object to show all data
    // If filters are active, pass them to show filtered aggregations
    const filtersToPass = hasActiveFilters ? activeFilters : {};
    
    const result = await getECRFAggregations(uploadId, filtersToPass);
    if (result.success && result.data) {
      // If no filters are active, override totalQueries with actual database total
      // This ensures Total Queries KPI shows the true count from database, not limited aggregation subset
      const adjustedAggregations = {
        ...result.data,
        totalQueries: !hasActiveFilters && totalRecords > 0 ? totalRecords : result.data.totalQueries,
      };
      setAggregations(adjustedAggregations);
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

    const result = await saveECRFHeaderMappings(companyId, mappingsArray);
    if (result.success) {
      setHeaderMappings(newMappings);
    } else {
      throw new Error(result.error || "Failed to save mappings");
    }
  };

  const handleUpload = async (newData: ECRFRecord[], fileName: string) => {
    setIsLoading(true);
    setLoadingMessage(`Uploading ${newData.length} query records...`);
    
    try {
      const columns = Object.keys(newData[0] || {});
      const columnConfigs = columns.map((col, index) => ({
        columnId: col,
        label: headerMappings[col] || col,
        tableOrder: index,
      }));

      const result = await uploadECRFData(
        companyId,
        profileId,
        fileName,
        newData,
        columnConfigs
      );

      if (result.success && result.data) {
        toast({
          title: "Upload Successful",
          description: `Uploaded ${newData.length} query records`,
        });

        await loadUploads();
        setSelectedUploadId(result.data);
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload query data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleUploadSelect = (uploadId: string) => {
    setSelectedUploadId(uploadId);
    setColumnFilters([]);
    setFilters({
      siteName: "",
      subjectId: "",
      eventName: "",
      formName: "",
      queryType: "",
      queryState: "",
      userRole: "",
      queryRaisedByRole: "",
    });
    setCurrentPage(1);
    setTotalRecords(0);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleUploadDelete = async (uploadId: string) => {
    setIsLoading(true);
    setLoadingMessage("Deleting upload...");
    
    const result = await deleteECRFUpload(uploadId);
    
    if (result.success) {
      toast({
        title: "Upload Deleted",
        description: "The upload and all associated data have been deleted",
      });
      
      await loadUploads();
      
      if (selectedUploadId === uploadId) {
        setSelectedUploadId(null);
        setData([]);
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (filteredData.length === 0) {
      toast({
        title: "No data to download",
        description: "Please upload data first",
        variant: "destructive",
      });
      return;
    }

    try {
      const headers = Object.keys(defaultHeaderLabels);
      const csvContent = [
        headers.map(h => headerMappings[h] || h).join(','),
        ...filteredData.map(row => 
          headers.map(h => {
            const value = row[h] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `ecrf_query_tracker_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download successful",
        description: `Downloaded ${filteredData.length} query records`,
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
    setColumnFilters([]);
    setFilters({
      siteName: "",
      subjectId: "",
      eventName: "",
      formName: "",
      queryType: "",
      queryState: "",
      userRole: "",
      queryRaisedByRole: "",
    });
  };

  // Filter data based on top filters
  const topFilteredData = useMemo(() => {
    // Server already filters for valid QueryState, so just apply user filters
    let result = [...data];

    if (filters.siteName) {
      result = result.filter((row) => {
        const siteName = row.SiteName || "";
        return siteName === filters.siteName; // Exact match for chart clicks
      });
    }

    if (filters.subjectId) {
      result = result.filter((row) => {
        const subjectId = row.SubjectId || "";
        return subjectId.toLowerCase().includes(filters.subjectId.toLowerCase());
      });
    }

    if (filters.eventName) {
      result = result.filter((row) => {
        const eventName = row.EventName || "";
        return eventName.toLowerCase().includes(filters.eventName.toLowerCase());
      });
    }

    if (filters.formName) {
      result = result.filter((row) => {
        const formName = row.FormName || "";
        return formName === filters.formName; // Exact match for chart clicks
      });
    }

    if (filters.queryType) {
      result = result.filter((row) => {
        const queryType = row.QueryType || "";
        return queryType === filters.queryType; // Exact match for chart clicks
      });
    }

    if (filters.queryState) {
      result = result.filter((row) => {
        const queryState = row.QueryState || "";
        return queryState === filters.queryState; // Exact match for chart clicks
      });
    }

    if (filters.userRole) {
      result = result.filter((row) => {
        const userRole = row.UserRole || "";
        return userRole.toLowerCase().includes(filters.userRole.toLowerCase());
      });
    }

    if (filters.queryRaisedByRole) {
      result = result.filter((row) => {
        const queryRaisedByRole = row.QueryRaisedByRole || "";
        return queryRaisedByRole === filters.queryRaisedByRole; // Exact match for chart clicks
      });
    }

    return result;
  }, [data, filters]);

  // Apply column filters on top of top filters
  const filteredData = useMemo(() => {
    let result = [...topFilteredData];

    columnFilters.forEach((filter) => {
      const columnId = filter.id;
      const filterValue = filter.value as string;
      
      if (filterValue) {
        result = result.filter((row) => {
          const cellValue = row[columnId as keyof ECRFRecord];
          return cellValue === filterValue;
        });
      }
    });

    return result;
  }, [topFilteredData, columnFilters]);

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
          <ECRFCSVUploadDialog 
            onUpload={handleUpload}
            companyId={companyId}
            profileId={profileId}
          />
          <ECRFHeaderRelabelModal 
            currentMappings={headerMappings}
            onSave={handleSaveHeaderMappings}
            disabled={!companyId}
          />
          <ECRFUploadHistory
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
            onClick={handlePrint}
            disabled={data.length === 0}
            className="text-[11px] h-8"
          >
            <Printer className="h-3 w-3 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={data.length === 0}
            className="text-[11px] h-8"
          >
            <Download className="h-3 w-3 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {data.length > 0 && (
        <>
          <ECRFFilters 
            filters={filters} 
            onFiltersChange={setFilters} 
            onResetAll={handleResetAllFilters}
            data={filteredData}
            filterOptions={filterOptions}
          />

          {aggregations && (
            <>
              <ECRFKPICards 
                metrics={aggregations}
              />

              <ECRFCharts 
                chartData={{
                  agingDistribution: aggregations.agingDistribution,
                  queriesByRole: aggregations.queriesByRole,
                  queriesBySite: aggregations.queriesBySite,
                  queriesByType: aggregations.queriesByType,
                  queriesByState: aggregations.queriesByState,
                  queriesByForm: aggregations.queriesByForm,
                  resolutionTimeBySite: aggregations.resolutionTimeBySite,
                }}
                filters={{
                  siteName: filters.siteName,
                  queryType: filters.queryType,
                  queryState: filters.queryState,
                  formName: filters.formName,
                  queryRaisedByRole: filters.queryRaisedByRole,
                }}
                onFilterChange={(filterName, value) => {
                  setFilters(prev => ({
                    ...prev,
                    [filterName]: value,
                  }));
                  setCurrentPage(1); // Reset to first page when chart is clicked
                }}
              />
            </>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Query Records</CardTitle>
            </CardHeader>
            <CardContent>
              <ECRFDataTable 
                data={filteredData} 
                headerMappings={headerMappings}
                columnFilters={columnFilters}
                onColumnFiltersChange={setColumnFilters}
                currentPage={currentPage}
                pageSize={pageSize}
                totalRecords={totalRecords}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </CardContent>
          </Card>
        </>
      )}

      {data.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-[11px] text-muted-foreground">
              {uploads.length === 0 
                ? "Upload a CSV file to get started"
                : "Select an upload from the history to view data"
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
