"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CSVUploadDialog } from "./csv-upload-dialog";
import { PatientDataTable } from "./patient-data-table";
import { ColumnVisibilityToggle } from "./column-visibility-toggle";
import { HeaderMappingUpload } from "./header-mapping-upload";
import { GroupedColumnVisibility } from "./grouped-column-visibility";
import { UploadHistory } from "./upload-history";
import { PatientEditModal } from "./patient-edit-modal";
import { PatientFilters } from "./patient-filters";
import { PatientRecord, ColumnConfig, FilterState, VisitGroupSpan } from "@/lib/types/patient-data";
import { parseTransposedHeaderCSV, createHeaderLookup, getVisitGroupForColumn } from "@/lib/utils/header-mapper";
import type { HeaderMapping } from "@/lib/utils/header-mapper";
import { Tables } from "@/lib/types/database.types";
import {
  uploadPatientData,
  getPatientUploads,
  getPatientData,
  getColumnConfigs,
  updateColumnConfigs,
  deletePatientUpload,
  getHeaderMappings,
  saveHeaderMappings,
  updatePatientRecord,
} from "@/lib/actions/patient-data";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface PatientsPageClientProps {
  companyId: string;
  profileId: string;
}

// Helper function to calculate days between two dates
function calculateDaysBetweenDates(laterDateString: string | undefined, earlierDateString: string | undefined): number {
  if (!laterDateString || laterDateString === '' || laterDateString === '—' ||
      !earlierDateString || earlierDateString === '' || earlierDateString === '—') {
    return 0;
  }
  
  try {
    // Parse MM/DD/YYYY format for both dates
    const [laterMonth, laterDay, laterYear] = laterDateString.split('/').map(num => parseInt(num, 10));
    const [earlierMonth, earlierDay, earlierYear] = earlierDateString.split('/').map(num => parseInt(num, 10));
    
    const laterDate = new Date(laterYear, laterMonth - 1, laterDay);
    const earlierDate = new Date(earlierYear, earlierMonth - 1, earlierDay);
    
    // Calculate difference in days
    const diffTime = laterDate.getTime() - earlierDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (error) {
    console.error('Error parsing dates:', laterDateString, earlierDateString, error);
    return 0;
  }
}

export function PatientsPageClient({ companyId, profileId }: PatientsPageClientProps) {
  // Upload selection (removed project selection)
  const [uploads, setUploads] = useState<Tables<'patient_uploads'>[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);

  // Data state
  const [data, setData] = useState<PatientRecord[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    globalSearch: "",
    columnFilters: {},
    dateRanges: {},
  });
  const [headerMappings, setHeaderMappings] = useState<HeaderMapping[]>([]);
  const [visitGroupSpans, setVisitGroupSpans] = useState<VisitGroupSpan[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Edit modal state
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Filter state
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedSiteName, setSelectedSiteName] = useState<string>('');
  
  const { toast } = useToast();

  // Calculate PRDAT automatically based on DTHDAT - PEPDAT
  const dataWithCalculations = useMemo(() => {
    return data.map(record => {
      // Get the two dates from the record
      const pepdat = record['E02_V2[1].PRO_01.PEP[1].PEPDAT'];
      const dthdat = record['COMMON_AE[1].LOG_AE.AE[2].DTHDAT'];
      
      // Calculate days between DTHDAT and PEPDAT (DTHDAT - PEPDAT)
      const daysDifference = calculateDaysBetweenDates(dthdat, pepdat);
      
      // Only update PRDAT if we have both dates and a valid calculation
      const calculatedPRDAT = (pepdat && dthdat && daysDifference !== 0) 
        ? String(daysDifference) 
        : record['COMMON_AE[1].LOG_AE.AE[1].PRDAT'] || '';
      
      // Return record with calculated PRDAT
      return {
        ...record,
        'COMMON_AE[1].LOG_AE.AE[1].PRDAT': calculatedPRDAT,
      };
    });
  }, [data]);

  // Load uploads on mount
  useEffect(() => {
    if (companyId) {
      loadUploads(companyId);
      loadHeaderMappings(companyId);
    }
  }, [companyId]);

  // Load patient data when upload changes
  useEffect(() => {
    if (selectedUploadId) {
      loadPatientData(selectedUploadId);
      loadColumnConfigs(selectedUploadId);
    }
  }, [selectedUploadId]);

  // Load uploads for the selected project
  const loadUploads = async (projectId: string) => {
    setIsLoading(true);
    setLoadingMessage("Loading uploads...");
    
    const result = await getPatientUploads(projectId);
    if (result.success && result.data) {
      setUploads(result.data);
      // Auto-select most recent upload
      if (result.data.length > 0) {
        setSelectedUploadId(result.data[0].id);
      } else {
        setSelectedUploadId(null);
        setData([]);
        setColumnConfigs([]);
      }
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to load uploads",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
    setLoadingMessage("");
  };

  // Load patient data for the selected upload - fetch ALL records
  const loadPatientData = async (uploadId: string) => {
    setIsLoading(true);
    setLoadingMessage("Loading patient data...");
    
    // Fetch all data at once (use large page size to get all records)
    const result = await getPatientData(uploadId, 1, 10000);
    if (result.success && result.data) {
      setData(result.data.patients);
      setTotalPatients(result.data.total);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to load patient data",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
    setLoadingMessage("");
  };

  // Load column configurations
  const loadColumnConfigs = async (uploadId: string) => {
    const result = await getColumnConfigs(uploadId);
    if (result.success && result.data) {
      setColumnConfigs(result.data);
      setColumnOrder(result.data.filter(c => c.visible).map(c => c.id));
      
      // Recalculate visit group spans
      const spans = recalculateVisitGroupSpans(result.data, result.data.filter(c => c.visible).map(c => c.id));
      setVisitGroupSpans(spans);
    }
  };

  // Load header mappings for project
  const loadHeaderMappings = async (companyId: string) => {
    const result = await getHeaderMappings(companyId);
    if (result.success && result.data) {
      // Convert database format to HeaderMapping format
      const mappings: HeaderMapping[] = result.data.map(m => ({
        originalHeader: m.original_header,
        customizedHeader: m.customized_header,
        visitGroup: m.visit_group || '',
        tableOrder: m.table_order || 0,
      }));
      setHeaderMappings(mappings);
      
      // Calculate visit group spans
      if (mappings.length > 0) {
        const spans = calculateVisitGroupSpansFromMappings(mappings);
        setVisitGroupSpans(spans);
      }
    }
  };

  // Handle CSV upload
  const handleUpload = async (newData: PatientRecord[], fileName: string) => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "No company ID available",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Processing patient data...");
    
    try {
      // Filter data based on header mappings if available
      let filteredData = newData;
      
      if (headerMappings.length > 0 && newData.length > 0) {
        setLoadingMessage("Filtering columns based on header mapping...");
        filteredData = filterDataByHeaderMappings(newData, headerMappings);
      }
      
      // Generate column configs
      setLoadingMessage("Configuring columns...");
      const newConfigs = generateColumnConfigs(filteredData, headerMappings);
      
      // Upload to Supabase
      setLoadingMessage("Uploading to database...");
      const result = await uploadPatientData(
        companyId,
        fileName,
        filteredData,
        newConfigs
      );
      
      if (result.success && result.data) {
        toast({
          title: "Upload Successful",
          description: `Uploaded ${filteredData.length} patient records`,
        });
        
        // Refresh uploads and select the new one
        await loadUploads(companyId);
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload patient data",
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

  // Filter data by header mappings - include ALL mapped headers even if not in data
  const filterDataByHeaderMappings = (
    data: PatientRecord[],
    mappings: HeaderMapping[]
  ): PatientRecord[] => {
    const normalizeBasic = (name: string) => name.trim().toLowerCase();
    const normalizeAggressive = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const basicMappings = new Map<string, string>();
    const aggressiveMappings = new Map<string, string>();
    
    mappings.forEach(m => {
      basicMappings.set(normalizeBasic(m.originalHeader), m.originalHeader);
      aggressiveMappings.set(normalizeAggressive(m.originalHeader), m.originalHeader);
    });
    
    const findMatchingHeader = (key: string): string | undefined => {
      const basicKey = normalizeBasic(key);
      if (basicMappings.has(basicKey)) {
        return basicMappings.get(basicKey);
      }
      
      const aggressiveKey = normalizeAggressive(key);
      if (aggressiveMappings.has(aggressiveKey)) {
        return aggressiveMappings.get(aggressiveKey);
      }
      
      return undefined;
    };
    
    return data.map(record => {
      // Start with all header mapping columns set to empty string
      const filteredRecord: Partial<PatientRecord> = {};
      mappings.forEach(m => {
        filteredRecord[m.originalHeader] = '';
      });
      
      // Then populate with actual data where available
      Object.keys(record).forEach(key => {
        const matchedHeader = findMatchingHeader(key);
        if (matchedHeader) {
          filteredRecord[matchedHeader] = record[key];
        }
      });
      return filteredRecord as PatientRecord;
    });
  };

  // Generate column configurations - include ALL header mappings
  const generateColumnConfigs = (
    data: PatientRecord[],
    mappings: HeaderMapping[]
  ): ColumnConfig[] => {
    const lookup = createHeaderLookup(mappings);
    
    // If we have mappings, use ALL mapping columns (not just what's in data)
    if (mappings.length > 0) {
      const configs = mappings.map(mapping => ({
        id: mapping.originalHeader,
        label: mapping.customizedHeader || mapping.originalHeader,
        originalLabel: mapping.originalHeader,
        visible: true,
        dataType: inferDataType(mapping.originalHeader) as 'text' | 'number' | 'date' | 'categorical',
        category: inferCategory(mapping.originalHeader) as 'demographics' | 'visits' | 'measurements' | 'adverse_events' | 'other',
        visitGroup: mapping.visitGroup || 'Other',
        tableOrder: mapping.tableOrder,
      }));
      
      // Sort by table order
      configs.sort((a, b) => (a.tableOrder || 999) - (b.tableOrder || 999));
      
      return configs;
    }
    
    // Fallback: no mappings, use columns from data
    if (data.length === 0) return [];
    
    const columns = Object.keys(data[0]);
    
    const configs = columns.map(col => ({
      id: col,
      label: lookup.get(col) || col,
      originalLabel: col,
      visible: true,
      dataType: inferDataType(col) as 'text' | 'number' | 'date' | 'categorical',
      category: inferCategory(col) as 'demographics' | 'visits' | 'measurements' | 'adverse_events' | 'other',
      visitGroup: 'Other',
      tableOrder: undefined,
    }));
    
    return configs;
  };

  // Handle column label changes
  const handleColumnLabelChange = async (columnId: string, newLabel: string) => {
    const updatedConfigs = columnConfigs.map((col) =>
      col.id === columnId ? { ...col, label: newLabel } : col
    );
    
    setColumnConfigs(updatedConfigs);
    
    // Save to database
    if (selectedUploadId) {
      await updateColumnConfigs(selectedUploadId, updatedConfigs);
    }
  };

  // Handle column visibility changes
  const handleColumnsChange = async (newColumns: ColumnConfig[]) => {
    setColumnConfigs(newColumns);
    
    // Update column order to only include visible columns
    const visibleIds = newColumns.filter(c => c.visible).map(c => c.id);
    setColumnOrder(visibleIds);
    
    // Recalculate visit group spans
    const newSpans = recalculateVisitGroupSpans(newColumns, visibleIds);
    setVisitGroupSpans(newSpans);
    
    // Save to database
    if (selectedUploadId) {
      await updateColumnConfigs(selectedUploadId, newColumns);
    }
  };

  // Handle column order changes
  const handleColumnOrderChange = (newOrder: string[]) => {
    setColumnOrder(newOrder);
  };

  // Handle header mapping load
  const handleMappingLoad = async (mappings: HeaderMapping[], spans: VisitGroupSpan[]) => {
    if (!companyId) {
      toast({
        title: "No Company",
        description: "Company information is missing",
        variant: "destructive",
      });
      return;
    }

    setHeaderMappings(mappings);
    setVisitGroupSpans(spans);
    
    // Save to database
    const result = await saveHeaderMappings(
      companyId,
      mappings.map(m => ({
        originalHeader: m.originalHeader,
        customizedHeader: m.customizedHeader,
        visitGroup: m.visitGroup,
        tableOrder: m.tableOrder,
      }))
    );
    
    if (result.success) {
      toast({
        title: "Header Mappings Saved",
        description: `Saved ${mappings.length} header mappings`,
      });
      
      // If we have data loaded, update column configs
      if (data.length > 0 && columnConfigs.length > 0) {
        const lookup = createHeaderLookup(mappings);
        
        const updatedConfigs = columnConfigs.map((col) => {
          const customLabel = lookup.get(col.originalLabel);
          const visitGroup = getVisitGroupForColumn(col.originalLabel, mappings);
          const mapping = mappings.find((m) => m.originalHeader === col.originalLabel);
          
          return {
            ...col,
            label: customLabel || col.label,
            visitGroup,
            tableOrder: mapping?.tableOrder,
          };
        });
        
        updatedConfigs.sort((a, b) => (a.tableOrder || 999) - (b.tableOrder || 999));
        
        setColumnConfigs(updatedConfigs);
        setColumnOrder(updatedConfigs.map(c => c.id));
        
        const newSpans = recalculateVisitGroupSpans(updatedConfigs, updatedConfigs.map(c => c.id));
        setVisitGroupSpans(newSpans);
      }
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to save header mappings",
        variant: "destructive",
      });
    }
  };

  // Handle upload selection
  const handleUploadSelect = (uploadId: string) => {
    setSelectedUploadId(uploadId);
    setCurrentPage(1);
  };

  // Handle upload deletion
  const handleUploadDelete = async (uploadId: string) => {
    setIsLoading(true);
    setLoadingMessage("Deleting upload...");
    
    const result = await deletePatientUpload(uploadId);
    
    if (result.success) {
      toast({
        title: "Upload Deleted",
        description: "The upload and all associated data have been deleted",
      });
      
      // Refresh uploads
      if (companyId) {
        await loadUploads(companyId);
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

  // Recalculate visit group spans
  const recalculateVisitGroupSpans = (
    configs: ColumnConfig[],
    order: string[]
  ): VisitGroupSpan[] => {
    const visibleConfigs = configs.filter(c => c.visible);
    const orderedConfigs = order.map(id => visibleConfigs.find(c => c.id === id)!).filter(Boolean);
    
    const spans: VisitGroupSpan[] = [];
    let currentGroup = '';
    let startIndex = 0;
    let count = 0;

    orderedConfigs.forEach((config, index) => {
      const group = config.visitGroup || 'Other';
      
      if (group !== currentGroup) {
        if (currentGroup && count > 0) {
          spans.push({
            visitGroup: currentGroup,
            startIndex,
            columnCount: count,
          });
        }
        currentGroup = group;
        startIndex = index;
        count = 1;
      } else {
        count++;
      }
    });

    if (currentGroup && count > 0) {
      spans.push({
        visitGroup: currentGroup,
        startIndex,
        columnCount: count,
      });
    }

    return spans;
  };

  const calculateVisitGroupSpansFromMappings = (mappings: HeaderMapping[]): VisitGroupSpan[] => {
    const sortedMappings = [...mappings].sort((a, b) => (a.tableOrder || 0) - (b.tableOrder || 0));
    
    const spans: VisitGroupSpan[] = [];
    let currentGroup = '';
    let startIndex = 0;
    let count = 0;

    sortedMappings.forEach((mapping, index) => {
      const group = mapping.visitGroup || 'Other';
      
      if (group !== currentGroup) {
        if (currentGroup && count > 0) {
          spans.push({
            visitGroup: currentGroup,
            startIndex,
            columnCount: count,
          });
        }
        currentGroup = group;
        startIndex = index;
        count = 1;
      } else {
        count++;
      }
    });

    if (currentGroup && count > 0) {
      spans.push({
        visitGroup: currentGroup,
        startIndex,
        columnCount: count,
      });
    }

    return spans;
  };

  // Handle visit group spans change
  const handleVisitGroupSpansChange = (spans: VisitGroupSpan[]) => {
    setVisitGroupSpans(spans);
  };

  // Handle row double click - open edit modal
  const handleRowDoubleClick = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setIsEditModalOpen(true);
  };

  // Handle save patient data
  const handleSavePatient = async (updatedPatient: PatientRecord) => {
    if (!selectedUploadId) {
      toast({
        title: "Error",
        description: "No upload selected",
        variant: "destructive",
      });
      return;
    }

    const subjectId = updatedPatient.SubjectId || updatedPatient['Subject ID'] || '';
    
    if (!subjectId) {
      toast({
        title: "Error",
        description: "Patient ID is required",
        variant: "destructive",
      });
      return;
    }

    const result = await updatePatientRecord(selectedUploadId, subjectId, updatedPatient);

    if (result.success) {
      toast({
        title: "Success",
        description: "Patient data updated successfully",
      });
      
      // Refresh patient data
      await loadPatientData(selectedUploadId);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update patient data",
        variant: "destructive",
      });
    }
  };

  // Filter data based on filters (client-side)
  const filteredData = useMemo(() => {
    let result = [...dataWithCalculations];

    // Filter by Patient ID
    if (selectedPatientId && selectedPatientId !== '') {
      result = result.filter((row) => {
        const patientId = (row as any).SubjectId || (row as any)['Subject ID'];
        return patientId === selectedPatientId;
      });
    }

    // Filter by Site Name
    if (selectedSiteName && selectedSiteName !== '') {
      result = result.filter((row) => {
        const siteName = (row as any).SiteName || (row as any)['Site Name'];
        return siteName === selectedSiteName;
      });
    }

    // Global search
    if (filters.globalSearch) {
      const searchLower = filters.globalSearch.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val || "").toLowerCase().includes(searchLower)
        )
      );
    }

    // Column filters
    Object.entries(filters.columnFilters).forEach(([columnId, filterValue]) => {
      if (filterValue) {
        result = result.filter((row) => {
          const cellValue = (row as any)[columnId];
          return String(cellValue || "") === String(filterValue);
        });
      }
    });

    return result;
  }, [dataWithCalculations, filters, selectedPatientId, selectedSiteName]);

  // Apply client-side pagination to filtered results
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, selectedPatientId, selectedSiteName]);

  // Calculate pagination info based on filtered data
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startRecord = filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endRecord = Math.min(currentPage * pageSize, filteredData.length);

  return (
    <div className="space-y-4">
      {/* Loading Indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border rounded-lg p-6 shadow-lg flex flex-col items-center space-y-4 min-w-[200px]">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-sm font-medium text-center">{loadingMessage}</p>
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <CSVUploadDialog onUpload={handleUpload} />
          <HeaderMappingUpload onMappingLoad={handleMappingLoad} />
          {headerMappings.length > 0 ? (
            <GroupedColumnVisibility
              columns={columnConfigs}
              onColumnsChange={handleColumnsChange}
              onVisitGroupSpansChange={handleVisitGroupSpansChange}
            />
          ) : (
            <ColumnVisibilityToggle
              columns={columnConfigs}
              onColumnsChange={handleColumnsChange}
            />
          )}
          <UploadHistory
            uploads={uploads}
            selectedUploadId={selectedUploadId}
            onUploadSelect={handleUploadSelect}
            onUploadDelete={handleUploadDelete}
          />
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          {selectedUploadId && (() => {
            const selectedUpload = uploads.find(u => u.id === selectedUploadId);
            if (!selectedUpload) return null;
            const uploadDate = new Date(selectedUpload.created_at);
            return (
              <div className="text-[10px] text-muted-foreground ml-auto">
                Viewing upload from: <span className="font-medium text-foreground">
                  {uploadDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })} at {uploadDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
            );
          })()}
        </CardHeader>
        <CardContent className="space-y-4">
          {data.length > 0 ? (
              <>
                {/* Filters */}
                <PatientFilters
                  data={dataWithCalculations}
                  selectedPatientId={selectedPatientId}
                  selectedSiteName={selectedSiteName}
                  onPatientIdChange={setSelectedPatientId}
                  onSiteNameChange={setSelectedSiteName}
                />
                
                <PatientDataTable
                  data={paginatedData}
                  columnConfigs={columnConfigs}
                  visitGroupSpans={visitGroupSpans}
                  onColumnLabelChange={handleColumnLabelChange}
                  columnOrder={columnOrder}
                  onColumnOrderChange={handleColumnOrderChange}
                  onVisitGroupSpansChange={handleVisitGroupSpansChange}
                  onRowDoubleClick={handleRowDoubleClick}
                />
                
                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    Showing {startRecord} to {endRecord} of {filteredData.length} patients
                    {filteredData.length !== totalPatients && (
                      <span className="text-muted-foreground/70"> (filtered from {totalPatients} total)</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/30 active:scale-95 transition-all duration-150"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/30 active:scale-95 transition-all duration-150"
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-150 ${
                              currentPage === pageNum
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'border-input bg-background hover:bg-black/30 active:scale-95'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/30 active:scale-95 transition-all duration-150"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/30 active:scale-95 transition-all duration-150"
                    >
                      Last
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {selectedUploadId 
                  ? "No patient data found for this upload"
                  : "Upload a CSV file to get started"}
              </div>
            )}
          </CardContent>
        </Card>

      {/* Patient Edit Modal */}
      <PatientEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPatient(null);
        }}
        patient={selectedPatient}
        columnConfigs={columnConfigs}
        onSave={handleSavePatient}
      />
    </div>
  );
}

// Helper functions
function inferDataType(columnName: string): string {
  if (columnName.includes('DATE') || columnName.includes('PEPDAT') || columnName.includes('DTHDAT')) {
    return 'date';
  }
  if (columnName.includes('AGE') || columnName.includes('BMI') || columnName.includes('BSA') ||
      columnName.includes('LVEF') || columnName.includes('LVEDV') || columnName.includes('LVESV') ||
      columnName.includes('Gradient') || columnName.includes('TOTDIST') || columnName.includes('NTPBNP')) {
    return 'number';
  }
  if (columnName.includes('SEX') || columnName.includes('NYHA') || columnName.includes('RAMCD') || 
      columnName.includes('Grade') || columnName.includes('MRGRADCD')) {
    return 'categorical';
  }
  return 'text';
}

function inferCategory(columnName: string): string {
  if (columnName.includes('SEX') || columnName.includes('AGE') || columnName === 'SubjectId' || 
      columnName === 'BMI' || columnName === 'BSA') {
    return 'demographics';
  }
  if (columnName.includes('DATE') || columnName.includes('PEPDAT')) {
    return 'visits';
  }
  if (columnName.includes('LVEF') || columnName.includes('LVEDV') || columnName.includes('LVESV') ||
      columnName.includes('Gradient') || columnName.includes('TOTDIST') || columnName.includes('NTPBNP')) {
    return 'measurements';
  }
  if (columnName.includes('AE') || columnName.includes('AEDECOD') || columnName.includes('DTHDAT') || 
      columnName.includes('PRDAT')) {
    return 'adverse_events';
  }
  return 'other';
}
