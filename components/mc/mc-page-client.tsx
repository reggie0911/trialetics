"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Download, TableProperties, GitCompare } from "lucide-react";
import { MCCSVUploadDialog, MCRecord } from "./mc-csv-upload-dialog";
import { MCDataTable } from "./mc-data-table";
import { MCPivotDataTable } from "./mc-pivot-data-table";
import { MCFilters } from "./mc-filters";
import { MCKPICards, KPIFilterType } from "./mc-kpi-cards";
import { MCCategoriesChart } from "./mc-categories-chart";
import { MCHeaderRelabelModal } from "./mc-header-relabel-modal";
import { MCUploadHistory } from "./mc-upload-history";
import { useToast } from "@/hooks/use-toast";
import { 
  getMCHeaderMappings, 
  saveMCHeaderMappings,
  getMCUploads,
  uploadMCData,
  getMCRecords,
  deleteMCUpload,
} from "@/lib/actions/mc-data";
import { ColumnFiltersState } from "@tanstack/react-table";
import { Tables } from "@/lib/types/database.types";
import { transformToPivotData } from "@/lib/utils/mc-pivot-transformer";

// View mode type
type ViewMode = 'standard' | 'pivot';

interface MCPageClientProps {
  companyId: string;
  profileId: string;
}

export function MCPageClient({ companyId, profileId }: MCPageClientProps) {
  // Upload management
  const [uploads, setUploads] = useState<Tables<'mc_uploads'>[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  
  // Data state
  const [data, setData] = useState<MCRecord[]>([]);
  const [headerMappings, setHeaderMappings] = useState<Record<string, string>>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [kpiFilter, setKpiFilter] = useState<KPIFilterType>(null);
  const [filters, setFilters] = useState({
    siteName: "",
    subjectId: "",
    medicationName: "",
    indication: "",
    ongoingStatus: "",
    frequency: "",
  });
  
  // Change status filter for pivot view
  const [changeStatusFilter, setChangeStatusFilter] = useState<'all' | 'Yes' | 'No' | '-'>('all');

  // Visit groups for multi-level headers
  const [visitGroups] = useState<Record<string, string>>({
    "SiteName": "Patient Info",
    "SubjectId": "Patient Info",
    "1.CCSVT": "Medication Details",
    "E02_V2[1].PRO_01.PEP[1].PEPDAT": "Medication Details",
    "1.CCMED": "Medication Details",
    "1.CCIND": "Medication Details",
    "1.CC1": "Medication Details",
    "1.CCUNIT": "Medication Details",
    "1.CCFREQ": "Medication Details",
    "1.CCSTDAT": "Dates & Status",
    "1.CMSTDATUN1": "Dates & Status",
    "1.CCSPDAT": "Dates & Status",
    "1.CCONGO1": "Dates & Status",
  });

  // Default header labels matching standard format
  const defaultHeaderLabels: Record<string, string> = {
    "SiteName": "SITE NAME",
    "SubjectId": "PATIENT ID",
    "1.CCSVT": "PROCEDURE DAT",
    "E02_V2[1].PRO_01.PEP[1].PEPDAT": "Procedure Date",
    "1.CCMED": "Medication Name",
    "1.CCIND": "Indication",
    "1.CC1": "Dose",
    "1.CCUNIT": "Unit",
    "1.CCFREQ": "Frequency",
    "1.CCSTDAT": "Start Date",
    "1.CMSTDATUN1": "Start Date Unknown",
    "1.CCSPDAT": "Stop Date",
    "1.CCONGO1": "Status",
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

  // Load MC data when upload is selected
  useEffect(() => {
    if (selectedUploadId) {
      loadMCData(selectedUploadId);
    }
  }, [selectedUploadId]);

  const loadHeaderMappings = async () => {
    const result = await getMCHeaderMappings(companyId);
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
    
    const result = await getMCUploads(companyId);
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

  const loadMCData = async (uploadId: string) => {
    setIsLoading(true);
    setLoadingMessage("Loading medication records...");
    
    const result = await getMCRecords(uploadId);
    console.log('📊 Load MC Data Result:', result);
    if (result.success && result.data) {
      console.log('📊 First Record Sample:', result.data.records[0]);
      console.log('📊 Total Records:', result.data.records.length);
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

    const result = await saveMCHeaderMappings(companyId, mappingsArray);
    if (result.success) {
      setHeaderMappings(newMappings);
    } else {
      throw new Error(result.error || "Failed to save mappings");
    }
  };

  // Handle CSV upload - now uploads to Supabase
  const handleUpload = async (newData: MCRecord[], fileName: string) => {
    setIsLoading(true);
    setLoadingMessage(`Uploading ${newData.length} medication records...`);
    
    try {
      // Prepare column configs
      const columns = Object.keys(newData[0] || {});
      const columnConfigs = columns.map((col, index) => ({
        columnId: col,
        label: headerMappings[col] || col,
        tableOrder: index,
      }));

      // Upload to Supabase
      const result = await uploadMCData(
        companyId,
        profileId,
        fileName,
        newData,
        columnConfigs
      );

      if (result.success && result.data) {
        toast({
          title: "Upload Successful",
          description: `Uploaded ${newData.length} medication records`,
        });

        // Reload uploads and select the new one
        await loadUploads();
        setSelectedUploadId(result.data);
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload medication data",
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
      medicationName: "",
      indication: "",
      ongoingStatus: "",
      frequency: "",
    });
  };

  const handleUploadDelete = async (uploadId: string) => {
    setIsLoading(true);
    setLoadingMessage("Deleting upload...");
    
    const result = await deleteMCUpload(uploadId);
    
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

  // Handle chart category click - filters the table by study visit
  const handleCategoryClick = (category: string | undefined) => {
    if (category) {
      // Add or update the 1.CCSVT filter
      setColumnFilters((prev) => {
        const existingFilterIndex = prev.findIndex((f) => f.id === "1.CCSVT");
        if (existingFilterIndex >= 0) {
          const newFilters = [...prev];
          newFilters[existingFilterIndex] = { id: "1.CCSVT", value: category };
          return newFilters;
        }
        return [...prev, { id: "1.CCSVT", value: category }];
      });
    } else {
      // Remove the 1.CCSVT filter
      setColumnFilters((prev) => prev.filter((f) => f.id !== "1.CCSVT"));
    }
  };

  // Get the currently selected category from column filters
  const selectedCategory = useMemo(() => {
    const studyVisitFilter = columnFilters.find((f) => f.id === "1.CCSVT");
    return studyVisitFilter?.value as string | undefined;
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
      let csvContent: string;
      let recordCount: number;
      let fileName: string;

      if (viewMode === 'pivot') {
        // Pivot view export
        const pivotResult = transformToPivotData(filteredData);
        const { rows: pivotRows, visitOrder } = pivotResult;
        
        // Apply change status filter if active
        const filteredPivotRows = changeStatusFilter === 'all' 
          ? pivotRows 
          : pivotRows.filter(row => 
              Object.values(row.visits).some(v => v.changeStatus === changeStatusFilter)
            );
        
        // Build headers: Static columns + per-visit columns
        const staticHeaders = ['Site Name', 'Patient ID', 'Procedure Date'];
        const visitFields = ['Medication Name', 'Dose', 'Unit', 'Frequency', 'Start Date', 'Start Date Unknown', 'Stop Date', 'Status', 'Change Status'];
        
        // First header row: Visit groups
        const visitGroupRow = [
          '', '', '', // Empty for static columns
          ...visitOrder.flatMap(visit => 
            visitFields.map((_, idx) => idx === 0 ? visit : '') // Only first cell of each visit group has the name
          )
        ];
        
        // Second header row: Column names
        const columnHeaderRow = [
          ...staticHeaders,
          ...visitOrder.flatMap(() => visitFields)
        ];
        
        // Data rows
        const dataRows = filteredPivotRows.map(row => {
          const staticData = [
            row.siteName || '',
            row.subjectId || '',
            row.procedureDate || '',
          ];
          
          const visitData = visitOrder.flatMap(visit => {
            const v = row.visits[visit];
            return [
              v?.medicationName || '',
              v?.dose || '',
              v?.unit || '',
              v?.frequency || '',
              v?.startDate || '',
              v?.startDateUnknown || '',
              v?.stopDate || '',
              v?.status || '',
              v?.changeStatus || '',
            ];
          });
          
          return [...staticData, ...visitData];
        });
        
        // Build CSV
        csvContent = [
          visitGroupRow.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','),
          columnHeaderRow.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','),
          ...dataRows.map(row => 
            row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
          )
        ].join('\n');
        
        recordCount = filteredPivotRows.length;
        fileName = `med_compliance_pivot_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        // Standard view export
        const headers = [
          "SiteName",
          "SubjectId",
          "1.CCSVT",
          "E02_V2[1].PRO_01.PEP[1].PEPDAT",
          "1.CCMED",
          "1.CCIND",
          "1.CC1",
          "1.CCUNIT",
          "1.CCFREQ",
          "1.CCSTDAT",
          "1.CMSTDATUN1",
          "1.CCSPDAT",
          "1.CCONGO1"
        ];

        csvContent = [
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
        
        recordCount = filteredData.length;
        fileName = `med_compliance_${new Date().toISOString().split('T')[0]}.csv`;
      }

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download successful",
        description: viewMode === 'pivot' 
          ? `Downloaded ${recordCount} pivot rows`
          : `Downloaded ${recordCount} medication records`,
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

  // Reset all filters (column filters, chart selection, KPI filter, and change status filter)
  const handleResetAllFilters = () => {
    setColumnFilters([]);
    setKpiFilter(null);
    setChangeStatusFilter('all');
  };

  // Handle KPI card click - filters the table
  const handleKpiCardClick = (filterType: KPIFilterType) => {
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

    if (filters.medicationName) {
      result = result.filter((row) => {
        const medName = row["1.CCMED"] || "";
        return medName.toLowerCase().includes(filters.medicationName.toLowerCase());
      });
    }

    if (filters.indication) {
      result = result.filter((row) => {
        const indication = row["1.CCIND"] || "";
        return indication.toLowerCase().includes(filters.indication.toLowerCase());
      });
    }

    if (filters.ongoingStatus) {
      result = result.filter((row) => {
        const status = row["1.CCONGO1"] || "";
        return status.toLowerCase().includes(filters.ongoingStatus.toLowerCase());
      });
    }

    if (filters.frequency) {
      result = result.filter((row) => {
        const freq = row["1.CCFREQ"] || "";
        return freq.toLowerCase().includes(filters.frequency.toLowerCase());
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
          const cellValue = row[columnId as keyof MCRecord];
          return cellValue === filterValue;
        });
      }
    });

    // Apply KPI filter
    if (kpiFilter) {
      switch (kpiFilter) {
        case "missingStartDate":
          result = result.filter((row) => 
            !row["1.CCSTDAT"] || row["1.CCSTDAT"].trim() === ""
          );
          break;
        case "startDateUnknown":
          result = result.filter((row) => 
            row["1.CMSTDATUN1"] === "Unknown" || row["1.CMSTDATUN1"] === "Y"
          );
          break;
        case "missingStopDate":
          result = result.filter((row) => 
            row["1.CCONGO1"] !== "Ongoing" && (!row["1.CCSPDAT"] || row["1.CCSPDAT"].trim() === "")
          );
          break;
        case "missingDoseOrUnit":
          result = result.filter((row) => 
            !row["1.CC1"] || !row["1.CCUNIT"]
          );
          break;
        case "invalidFrequency":
          result = result.filter((row) => {
            const freq = row["1.CCFREQ"];
            const validFreqs = ['QD', 'BID', 'TID', 'QID', 'PRN', '1x', 'Other'];
            return freq && !validFreqs.some(v => freq.includes(v));
          });
          break;
        case "partialData":
          result = result.filter((row) => {
            const fields = [row["1.CCMED"], row["1.CC1"], row["1.CCUNIT"], row["1.CCFREQ"], row["1.CCSTDAT"]];
            const filledFields = fields.filter(f => f && f.trim() !== "").length;
            return filledFields > 0 && filledFields < fields.length;
          });
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
    const totalMeds = topFilteredData.length;
    const missingStartDate = topFilteredData.filter(row => 
      !row["1.CCSTDAT"] || row["1.CCSTDAT"].trim() === ""
    ).length;
    const startDateUnknown = topFilteredData.filter(row => 
      row["1.CMSTDATUN1"] === "Unknown" || row["1.CMSTDATUN1"] === "Y"
    ).length;
    const missingStopDate = topFilteredData.filter(row => 
      row["1.CCONGO1"] !== "Ongoing" && (!row["1.CCSPDAT"] || row["1.CCSPDAT"].trim() === "")
    ).length;
    const missingDoseOrUnit = topFilteredData.filter(row => 
      !row["1.CC1"] || !row["1.CCUNIT"]
    ).length;
    const invalidFreq = topFilteredData.filter(row => {
      const freq = row["1.CCFREQ"];
      const validFreqs = ['QD', 'BID', 'TID', 'QID', 'PRN', '1x', 'Other'];
      return freq && !validFreqs.some(v => freq.includes(v));
    }).length;
    const partialData = topFilteredData.filter(row => {
      const fields = [row["1.CCMED"], row["1.CC1"], row["1.CCUNIT"], row["1.CCFREQ"], row["1.CCSTDAT"]];
      const filledFields = fields.filter(f => f && f.trim() !== "").length;
      return filledFields > 0 && filledFields < fields.length;
    }).length;

    return {
      totalMeds,
      missingStartDate,
      startDateUnknown,
      missingStopDate,
      missingDoseOrUnit,
      invalidFreq,
      partialData,
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
          <MCCSVUploadDialog 
            onUpload={handleUpload}
            companyId={companyId}
            profileId={profileId}
          />
          <MCHeaderRelabelModal 
            currentMappings={headerMappings}
            onSave={handleSaveHeaderMappings}
            disabled={!companyId}
          />
          <MCUploadHistory
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
          <MCFilters 
            filters={filters} 
            onFiltersChange={setFilters} 
            onResetAll={handleResetAllFilters}
            data={data}
            viewMode={viewMode}
            changeStatusFilter={changeStatusFilter}
            onChangeStatusFilterChange={setChangeStatusFilter}
          />

          {/* KPI Cards */}
          <MCKPICards 
            metrics={kpiMetrics} 
            selectedFilter={kpiFilter}
            onCardClick={handleKpiCardClick}
          />

          {/* MC Categories Chart */}
          <MCCategoriesChart 
            data={filteredData} 
            selectedCategory={selectedCategory}
            onCategoryClick={handleCategoryClick}
          />

          {/* Data Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Medication Records</CardTitle>
                
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                  <Button
                    variant={viewMode === 'standard' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-3 text-[11px]"
                    onClick={() => setViewMode('standard')}
                  >
                    <TableProperties className="h-3 w-3 mr-1.5" />
                    Standard View
                  </Button>
                  <Button
                    variant={viewMode === 'pivot' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-3 text-[11px]"
                    onClick={() => setViewMode('pivot')}
                  >
                    <GitCompare className="h-3 w-3 mr-1.5" />
                    Pivot View
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === 'standard' ? (
                <MCDataTable 
                  data={filteredData} 
                  headerMappings={headerMappings}
                  columnFilters={columnFilters}
                  onColumnFiltersChange={setColumnFilters}
                  visitGroups={visitGroups}
                />
              ) : (
                <MCPivotDataTable 
                  data={filteredData} 
                  headerMappings={headerMappings}
                  changeStatusFilter={changeStatusFilter}
                />
              )}
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
