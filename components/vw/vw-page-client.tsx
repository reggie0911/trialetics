"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Download } from "lucide-react";
import { VWCSVUploadDialog, VWRecord } from "./vw-csv-upload-dialog";
import { VWDataTable } from "./vw-data-table";
import { VWFilters } from "./vw-filters";
import { VWKPICards, VWKPIFilterType } from "./vw-kpi-cards";
import { VWCategoriesChart } from "./vw-categories-chart";
import { VWHeaderRelabelModal } from "./vw-header-relabel-modal";
import { VWUploadHistory } from "./vw-upload-history";
import { useToast } from "@/hooks/use-toast";
import { 
  getVWHeaderMappings, 
  saveVWHeaderMappings,
  getVWUploads,
  uploadVWData,
  getVWRecords,
  deleteVWUpload,
} from "@/lib/actions/vw-data";
import { ColumnFiltersState } from "@tanstack/react-table";
import { Tables } from "@/lib/types/database.types";

interface VWPageClientProps {
  companyId: string;
  profileId: string;
}

export function VWPageClient({ companyId, profileId }: VWPageClientProps) {
  // Upload management
  const [uploads, setUploads] = useState<Tables<'vw_uploads'>[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  
  // Data state
  const [data, setData] = useState<VWRecord[]>([]);
  const [headerMappings, setHeaderMappings] = useState<Record<string, string>>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [kpiFilter, setKpiFilter] = useState<VWKPIFilterType>(null);
  const [filters, setFilters] = useState({
    siteName: "",
    subjectId: "",
    eventName: "",
    eventStatus: "",
    alertStatus: "",
  });

  // Visit groups for multi-level headers
  const [visitGroups] = useState<Record<string, string>>({
    "SiteName": "Patient Info",
    "SubjectId": "Patient Info",
    "EventName": "Visit Details",
    "EventStatus": "Visit Details",
    "AlertStatus": "Visit Details",
    "ProcedureDate": "Dates & Baseline",
    "DeathDate": "Dates & Baseline",
    "EventDate": "Dates & Windows",
    "PlannedDate": "Dates & Windows",
    "ProposedDate": "Dates & Windows",
    "WindowStartDate": "Dates & Windows",
    "WindowEndDate": "Dates & Windows",
  });

  // Default header labels matching standard format
  const defaultHeaderLabels: Record<string, string> = {
    "SiteName": "Site Name",
    "SubjectId": "Subject ID",
    "EventName": "Event Name",
    "EventStatus": "Event Status",
    "ProcedureDate": "Procedure Date",
    "DeathDate": "Death Date",
    "EventDate": "Event Date",
    "PlannedDate": "Planned Date",
    "ProposedDate": "Proposed Date",
    "WindowStartDate": "Window Start Date",
    "WindowEndDate": "Window End Date",
    "AlertStatus": "Alert Status",
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

  // Load VW data when upload is selected
  useEffect(() => {
    if (selectedUploadId) {
      loadVWData(selectedUploadId);
    }
  }, [selectedUploadId]);

  const loadHeaderMappings = async () => {
    const result = await getVWHeaderMappings(companyId);
    if (result.success && result.data) {
      const mappings: Record<string, string> = {};
      result.data.forEach(mapping => {
        mappings[mapping.original_header] = mapping.customized_header;
      });
      // Merge with defaults
      setHeaderMappings({ ...defaultHeaderLabels, ...mappings });
    } else {
      // Use default labels if no custom mappings
      setHeaderMappings(defaultHeaderLabels);
    }
  };

  const loadUploads = async () => {
    setIsLoading(true);
    setLoadingMessage("Loading uploads...");
    
    const result = await getVWUploads(companyId);
    if (result.success && result.data) {
      setUploads(result.data);
      
      // Auto-select most recent upload
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

  const loadVWData = async (uploadId: string) => {
    setIsLoading(true);
    setLoadingMessage("Loading visit window records...");
    
    const result = await getVWRecords(uploadId);
    if (result.success && result.data) {
      setData(result.data.records);
    } else if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      setData([]);
    }
    
    setIsLoading(false);
    setLoadingMessage("");
  };

  const handleSaveHeaderMappings = async (newMappings: Record<string, string>) => {
    const mappingsArray = Object.entries(newMappings).map(([original, customized], index) => ({
      originalHeader: original,
      customizedHeader: customized,
      tableOrder: index,
    }));

    const result = await saveVWHeaderMappings(companyId, mappingsArray);
    if (result.success) {
      setHeaderMappings(newMappings);
    } else {
      throw new Error(result.error || "Failed to save mappings");
    }
  };

  // Handle CSV upload - now uploads to Supabase
  const handleUpload = async (newData: VWRecord[], fileName: string) => {
    setIsLoading(true);
    setLoadingMessage(`Uploading ${newData.length} visit window records...`);
    
    try {
      // Prepare column configs
      const columns = Object.keys(newData[0] || {});
      const columnConfigs = columns.map((col, index) => ({
        columnId: col,
        label: headerMappings[col] || col,
        tableOrder: index,
      }));

      // Upload to Supabase
      const result = await uploadVWData(
        companyId,
        profileId,
        fileName,
        newData,
        columnConfigs
      );

      if (result.success && result.data) {
        toast({
          title: "Upload Successful",
          description: `Uploaded ${newData.length} visit window records`,
        });

        // Reload uploads and select the new one
        await loadUploads();
        setSelectedUploadId(result.data);
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload visit window data",
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
    // Reset filters when switching uploads
    setColumnFilters([]);
    setKpiFilter(null);
    setFilters({
      siteName: "",
      subjectId: "",
      eventName: "",
      eventStatus: "",
      alertStatus: "",
    });
  };

  const handleUploadDelete = async (uploadId: string) => {
    setIsLoading(true);
    setLoadingMessage("Deleting upload...");
    
    const result = await deleteVWUpload(uploadId);
    
    if (result.success) {
      toast({
        title: "Upload Deleted",
        description: "The upload and all associated data have been deleted",
      });
      
      // Reload uploads
      await loadUploads();
      
      // Clear selection if deleted upload was selected
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

  // Handle chart category click - filters the table by alert status
  const handleCategoryClick = (category: string | undefined) => {
    if (category) {
      // Add or update the AlertStatus filter
      setColumnFilters((prev) => {
        const existingFilterIndex = prev.findIndex((f) => f.id === "AlertStatus");
        if (existingFilterIndex >= 0) {
          const newFilters = [...prev];
          newFilters[existingFilterIndex] = { id: "AlertStatus", value: category };
          return newFilters;
        }
        return [...prev, { id: "AlertStatus", value: category }];
      });
    } else {
      // Remove the AlertStatus filter
      setColumnFilters((prev) => prev.filter((f) => f.id !== "AlertStatus"));
    }
  };

  // Get the currently selected category from column filters
  const selectedCategory = useMemo(() => {
    const alertStatusFilter = columnFilters.find((f) => f.id === "AlertStatus");
    return alertStatusFilter?.value as string | undefined;
  }, [columnFilters]);

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle download as CSV
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
      // Get column headers
      const headers = Object.keys(defaultHeaderLabels);

      // Create CSV content
      const csvContent = [
        // Header row with custom labels
        headers.map(h => headerMappings[h] || h).join(','),
        // Data rows
        ...filteredData.map(row => 
          headers.map(h => {
            const value = row[h] || '';
            // Escape commas and quotes
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `visit_window_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download successful",
        description: `Downloaded ${filteredData.length} visit window records`,
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

  // Reset all filters (column filters, chart selection, and KPI filter)
  const handleResetAllFilters = () => {
    setColumnFilters([]);
    setKpiFilter(null);
  };

  // Handle KPI card click - filters the table
  const handleKpiCardClick = (filterType: VWKPIFilterType) => {
    setKpiFilter(filterType);
  };

  // Filter data based on top filters
  const topFilteredData = useMemo(() => {
    let result = [...data];

    if (filters.siteName) {
      result = result.filter((row) => {
        const siteName = row.SiteName || "";
        return siteName.toLowerCase().includes(filters.siteName.toLowerCase());
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

    if (filters.eventStatus) {
      result = result.filter((row) => {
        const eventStatus = row.EventStatus || "";
        return eventStatus.toLowerCase().includes(filters.eventStatus.toLowerCase());
      });
    }

    if (filters.alertStatus) {
      result = result.filter((row) => {
        const alertStatus = row.AlertStatus || "";
        return alertStatus.toLowerCase() === filters.alertStatus.toLowerCase();
      });
    }

    return result;
  }, [data, filters]);

  // Apply column filters and KPI filter on top of top filters
  const filteredData = useMemo(() => {
    let result = [...topFilteredData];

    // Apply each column filter
    columnFilters.forEach((filter) => {
      const columnId = filter.id;
      const filterValue = filter.value as string;
      
      if (filterValue) {
        result = result.filter((row) => {
          const cellValue = row[columnId as keyof VWRecord];
          return cellValue === filterValue;
        });
      }
    });

    // Apply KPI filter
    if (kpiFilter) {
      switch (kpiFilter) {
        case "activeFollowUps":
          result = result.filter((row) => 
            row.AlertStatus === "YELLOW" || row.AlertStatus === "RED"
          );
          break;
        case "total":
          // No additional filtering needed - show all
          break;
      }
    }

    return result;
  }, [topFilteredData, columnFilters, kpiFilter]);

  // Calculate KPI metrics from topFilteredData (excludes KPI and column filters)
  const kpiMetrics = useMemo(() => {
    // Total unique subjects
    const uniqueSubjects = new Set(topFilteredData.map(row => row.SubjectId)).size;
    
    // Subjects with active follow-up requirements (any YELLOW or RED alerts)
    const subjectsWithAlerts = new Set(
      topFilteredData
        .filter(row => row.AlertStatus === "YELLOW" || row.AlertStatus === "RED")
        .map(row => row.SubjectId)
    ).size;
    
    // Visit alert rate (percentage of visits with YELLOW or RED)
    const totalVisits = topFilteredData.length;
    const alertVisits = topFilteredData.filter(row => 
      row.AlertStatus === "YELLOW" || row.AlertStatus === "RED"
    ).length;
    const alertRate = totalVisits > 0 ? ((alertVisits / totalVisits) * 100).toFixed(1) : "0.0";

    return {
      totalSubjects: uniqueSubjects,
      activeFollowUps: subjectsWithAlerts,
      alertRate: `${alertRate}%`,
    };
  }, [topFilteredData]);

  return (
    <div className="space-y-4">
      {/* Loading Overlay */}
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
          <VWCSVUploadDialog 
            onUpload={handleUpload}
            companyId={companyId}
            profileId={profileId}
          />
          <VWHeaderRelabelModal 
            currentMappings={headerMappings}
            onSave={handleSaveHeaderMappings}
            disabled={!companyId}
          />
          <VWUploadHistory
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

      {/* Filters */}
      {data.length > 0 && (
        <>
          <VWFilters 
            filters={filters} 
            onFiltersChange={setFilters} 
            onResetAll={handleResetAllFilters}
            data={data} 
          />

          {/* KPI Cards */}
          <VWKPICards 
            metrics={kpiMetrics} 
            selectedFilter={kpiFilter}
            onCardClick={handleKpiCardClick}
          />

          {/* VW Categories Chart */}
          <VWCategoriesChart 
            data={filteredData} 
            selectedCategory={selectedCategory}
            onCategoryClick={handleCategoryClick}
          />

          {/* Data Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Visit Window Records</CardTitle>
            </CardHeader>
            <CardContent>
              <VWDataTable 
                data={filteredData} 
                headerMappings={headerMappings}
                columnFilters={columnFilters}
                onColumnFiltersChange={setColumnFilters}
                visitGroups={visitGroups}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
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
