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
import { Loader2, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

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

// Helper function to calculate BSA using Mosteller formula
function calculateBSA(heightCm: string | undefined, weightKg: string | undefined): string {
  if (!heightCm || !weightKg || heightCm === '' || heightCm === '—' ||
      weightKg === '' || weightKg === '—') {
    return '';
  }
  
  try {
    const height = parseFloat(heightCm);
    const weight = parseFloat(weightKg);
    
    if (isNaN(height) || isNaN(weight) || height <= 0 || weight <= 0) {
      return '';
    }
    
    // Mosteller formula: BSA (m²) = √[(Height(cm) × Weight(kg)) / 3600]
    const bsa = Math.sqrt((height * weight) / 3600);
    return bsa.toFixed(2); // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating BSA:', error);
    return '';
  }
}

// Helper function to calculate remodeling percentage
// Formula: ((baseline - followup) / baseline) * 100
function calculateRemodelingPercentage(
  baseline: string | undefined,
  followup: string | undefined
): string {
  if (!baseline || !followup || baseline === '' || baseline === '—' ||
      followup === '' || followup === '—') {
    return '';
  }
  
  try {
    const baselineVal = parseFloat(baseline);
    const followupVal = parseFloat(followup);
    
    if (isNaN(baselineVal) || isNaN(followupVal) || baselineVal === 0) {
      return '';
    }
    
    const percentage = ((baselineVal - followupVal) / baselineVal) * 100;
    return percentage.toFixed(2);
  } catch (error) {
    console.error('Error calculating remodeling percentage:', error);
    return '';
  }
}

// Helper function to add days to a date string
function addDaysToDate(dateStr: string | undefined, days: number): string {
  if (!dateStr || dateStr === '' || dateStr === '—') {
    return '';
  }
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  } catch (error) {
    console.error('Error adding days to date:', error);
    return '';
  }
}

// Helper function to format date for display
function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch {
    return dateStr;
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const { toast } = useToast();

  // Calculate PRDAT automatically based on DTHDAT - Implant Date (E02_V2[1]..DATE)
  const dataWithCalculations = useMemo(() => {
    return data.map((record, idx) => {
      const implantDate = record['E02_V2[1]..DATE'];
      const patientId = record.SubjectId || record['Subject ID'] || '';
      
      // Find first non-empty death date from all COMMON_AE entries (1-16)
      // The data should already be consolidated during upload, but this handles legacy data
      let dthdat = '';
      
      for (let i = 1; i <= 16; i++) {
        const aeKey = `COMMON_AE[${i}].LOG_AE.AE[1].DTHDAT` as keyof PatientRecord;
        const date = record[aeKey];
        if (date && date !== '' && date !== '—') {
          dthdat = date;
          break; // Use first found death date
        }
      }
      
      // Calculate days between DTHDAT and Implant Date (DTHDAT - E02_V2[1]..DATE)
      const daysDifference = calculateDaysBetweenDates(dthdat, implantDate);
      
      // Only calculate PRDAT if we have a death date
      // If no death date, PRDAT should be blank regardless of CSV value
      const calculatedPRDAT = (dthdat && implantDate && daysDifference !== 0) 
        ? String(daysDifference) 
        : '';
      
      // Calculate BSA from height and weight
      const height = record['E01_V1[1].SCR_01.VS[1].HEIGHT_VSORRES'];
      const weight = record['E01_V1[1].SCR_01.VS[1].WEIGHT_VSORRES'];
      const calculatedBSA = calculateBSA(height, weight);
      
      // Calculate remodeling percentages
      // Use the raw echo measurements (SE fields) for screening baseline and 1-year follow-up
      const screeningLVEDV = record['E01_V1[1].SCR_05.SE[1].SE_LVEDV'];
      const oneYearLVEDV = record['E06_V6[1].Y1_09.SE[1].SE_LVEDV'];
      const diastolicRemodeling = calculateRemodelingPercentage(screeningLVEDV, oneYearLVEDV);

      const screeningLVESV = record['E01_V1[1].SCR_05.SE[1].SE_LVESV'];
      const oneYearLVESV = record['E06_V6[1].Y1_09.SE[1].SE_LVESV'];
      const systolicRemodeling = calculateRemodelingPercentage(screeningLVESV, oneYearLVESV);
      
      // Calculate visit window openings based on procedure date
      const procedureDate = record['E02_V2[1]..DATE'];
      const windows = [
        { name: '30-Day', openDate: addDaysToDate(procedureDate, 23) },    // 30 - 7
        { name: '90-Day', openDate: addDaysToDate(procedureDate, 60) },    // 90 - 30
        { name: '6-Month', openDate: addDaysToDate(procedureDate, 150) },  // 180 - 30
        { name: '1-Year', openDate: addDaysToDate(procedureDate, 335) },   // 365 - 30
        { name: '2-Year', openDate: addDaysToDate(procedureDate, 640) },   // 730 - 90
      ];

      // Find latest (furthest in future) window that is still in the future (or latest if all past)
      const today = new Date().toISOString().split('T')[0];
      let nextWindowOpen = '';
      let nextVisitName = '';

      const futureWindows = windows.filter(w => w.openDate && w.openDate >= today);
      if (futureWindows.length > 0) {
        // Use the latest future window (last in the array)
        const latestWindow = futureWindows[futureWindows.length - 1];
        nextWindowOpen = formatDateForDisplay(latestWindow.openDate);
        nextVisitName = latestWindow.name;
      } else if (windows.length > 0 && windows[windows.length - 1].openDate) {
        // All windows have passed, use the latest one
        const latestWindow = windows[windows.length - 1];
        nextWindowOpen = formatDateForDisplay(latestWindow.openDate);
        nextVisitName = latestWindow.name;
      }

      // Determine Next Visit values - show "Death" if death occurred
      const calculatedNextVisit = dthdat ? 'Death' : nextVisitName;
      const calculatedNextWindowOpen = dthdat ? 'Death' : nextWindowOpen;
      
      // Populate ALL DTHDAT columns with the consolidated death date
      // This ensures the "Date of Death" column shows the value regardless of which AE entry it's mapped to
      // Also handle header mapping typos like trailing )
      const dthdatOverrides: Record<string, string> = {};
      for (let i = 1; i <= 16; i++) {
        const aeKey = `COMMON_AE[${i}].LOG_AE.AE[1].DTHDAT`;
        if (dthdat) {
          dthdatOverrides[aeKey] = dthdat;
          // Also set version with trailing ) in case of header mapping typo
          dthdatOverrides[`${aeKey})`] = dthdat;
        }
      }
      
      // Return record with calculated PRDAT, consolidated DTHDAT across all AE entries, BSA, remodeling percentages, and visit windows
      return {
        ...record,
        ...dthdatOverrides, // Spread all DTHDAT overrides
        'COMMON_AE[1].LOG_AE.AE[1].PRDAT': calculatedPRDAT,
        BSA: calculatedBSA || record.BSA || '', // Use calculated BSA, fallback to CSV value
        '1 yr Diastolic Remodeling %': diastolicRemodeling || record['1 yr Diastolic Remodeling %'] || '',
        '1 yr Systolic Remodeling %': systolicRemodeling || record['1 yr Systolic Remodeling %'] || '',
        'Next Visit Window Open': calculatedNextWindowOpen || record['Next Visit Window Open'] || '',
        'Next Visit': calculatedNextVisit || record['Next Visit'] || '',
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
      // Ensure all columns are visible by default
      const allVisibleConfigs = result.data.map(config => ({
        ...config,
        visible: true, // Override to make all columns visible
      }));
      
      setColumnConfigs(allVisibleConfigs);
      setColumnOrder(allVisibleConfigs.map(c => c.id)); // Include all columns in order
      
      // Recalculate visit group spans with all columns
      const spans = recalculateVisitGroupSpans(allVisibleConfigs, allVisibleConfigs.map(c => c.id));
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
  // Also consolidates multi-column data (like DTHDAT from COMMON_AE[1-15]) into single mapped columns
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
    
    // Find the mapped DTHDAT column (if any) - typically COMMON_AE[1].LOG_AE.AE[1].DTHDAT
    // Handle potential typos like trailing ) in header mapping
    const dthdatMapping = mappings.find(m => {
      const header = m.originalHeader.replace(/\)$/, ''); // Remove trailing ) if present
      return header.endsWith('.DTHDAT') && header.includes('COMMON_AE');
    });
    
    return data.map((record, idx) => {
      // Start with all header mapping columns set to empty string
      const filteredRecord: Partial<PatientRecord> = {};
      mappings.forEach(m => {
        filteredRecord[m.originalHeader] = '';
      });
      
      // Consolidate DTHDAT: look for first non-empty value from COMMON_AE[1-16].LOG_AE.AE[1].DTHDAT
      // Only check columns ending with exactly .DTHDAT (not DTHDATUNK98 variants)
      if (dthdatMapping) {
        let consolidatedDthdat = '';
        for (let i = 1; i <= 16; i++) {
          const aeKey = `COMMON_AE[${i}].LOG_AE.AE[1].DTHDAT`;
          // Access as generic object since CSV may have columns not in PatientRecord type
          const value = (record as Record<string, string>)[aeKey];
          if (value && value !== '' && value !== '—') {
            consolidatedDthdat = value;
            break; // Use first non-empty death date
          }
        }
        if (consolidatedDthdat) {
          filteredRecord[dthdatMapping.originalHeader] = consolidatedDthdat;
        }
      }
      
      // Then populate with actual data where available
      // (DTHDAT fields are already handled above, so this will only overwrite if the mapped DTHDAT[1] has a value)
      Object.keys(record).forEach(key => {
        const matchedHeader = findMatchingHeader(key);
        if (matchedHeader) {
          // Don't overwrite already-consolidated DTHDAT with empty value
          if (matchedHeader === dthdatMapping?.originalHeader && filteredRecord[matchedHeader]) {
            // Keep the consolidated value unless this one is also non-empty
            const newValue = record[key as keyof PatientRecord];
            if (newValue && newValue !== '' && newValue !== '—') {
              filteredRecord[matchedHeader] = newValue;
            }
          } else {
            filteredRecord[matchedHeader] = record[key as keyof PatientRecord];
          }
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
      // Deduplicate mappings by originalHeader (keep last occurrence)
      const deduplicatedMappings = Array.from(
        new Map(mappings.map(m => [m.originalHeader, m])).values()
      );
      
      const configs = deduplicatedMappings.map(mapping => ({
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
      
      // Regenerate column configs from ALL header mappings (regardless of whether data is loaded)
      // Deduplicate mappings by originalHeader (keep last occurrence)
      const deduplicatedMappings = Array.from(
        new Map(mappings.map(m => [m.originalHeader, m])).values()
      );
      
      // Regenerate configs from all deduplicated mappings to ensure all unique columns are included
      const newConfigs = deduplicatedMappings.map(mapping => ({
        id: mapping.originalHeader,
        label: mapping.customizedHeader || mapping.originalHeader,
        originalLabel: mapping.originalHeader,
        visible: true,
        dataType: inferDataType(mapping.originalHeader) as 'text' | 'number' | 'date' | 'categorical',
        category: inferCategory(mapping.originalHeader) as 'demographics' | 'visits' | 'measurements' | 'adverse_events' | 'other',
        visitGroup: mapping.visitGroup || 'Other',
        tableOrder: mapping.tableOrder,
      }));
      
      newConfigs.sort((a, b) => (a.tableOrder || 999) - (b.tableOrder || 999));
      
      setColumnConfigs(newConfigs);
      setColumnOrder(newConfigs.map(c => c.id));
      
      const newSpans = recalculateVisitGroupSpans(newConfigs, newConfigs.map(c => c.id));
      setVisitGroupSpans(newSpans);
      
      // Save the new configs to database if we have an upload
      if (selectedUploadId) {
        await updateColumnConfigs(selectedUploadId, newConfigs);
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

    // Search query - search across all columns
    if (searchQuery && searchQuery.trim() !== '') {
      const searchLower = searchQuery.toLowerCase().trim();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val || "").toLowerCase().includes(searchLower)
        )
      );
    }

    // Global search (legacy, keeping for compatibility)
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
  }, [dataWithCalculations, filters, selectedPatientId, selectedSiteName, searchQuery]);

  // Apply client-side pagination to filtered results
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, selectedPatientId, selectedSiteName, searchQuery]);

  // Calculate pagination info based on filtered data
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startRecord = filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endRecord = Math.min(currentPage * pageSize, filteredData.length);

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
      // Get visible columns in order
      const visibleColumns = columnConfigs
        .filter(c => c.visible)
        .sort((a, b) => (a.tableOrder || 999) - (b.tableOrder || 999));

      // Build visit group header row (first row)
      const visitGroupRow: string[] = [];
      let currentGroup = '';
      let groupStartIndex = 0;

      visibleColumns.forEach((col, index) => {
        const group = col.visitGroup || 'Other';
        
        if (group !== currentGroup) {
          // Fill previous group cells with empty strings (except the first cell which has the group name)
          if (currentGroup) {
            for (let i = groupStartIndex; i < index; i++) {
              if (i === groupStartIndex) {
                visitGroupRow.push(currentGroup);
              } else {
                visitGroupRow.push('');
              }
            }
          }
          currentGroup = group;
          groupStartIndex = index;
        }
      });
      
      // Fill the last group
      for (let i = groupStartIndex; i < visibleColumns.length; i++) {
        if (i === groupStartIndex) {
          visitGroupRow.push(currentGroup);
        } else {
          visitGroupRow.push('');
        }
      }

      // Build column header row (second row) using customized labels
      const columnHeaders = visibleColumns.map(c => c.label);

      // Build CSV content
      const csvContent = [
        // Visit group row
        visitGroupRow.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
        // Column header row
        columnHeaders.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
        // Data rows
        ...filteredData.map(row => 
          visibleColumns.map(col => {
            const value = (row as any)[col.id] || '';
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
      link.setAttribute('download', `patient_data_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download successful",
        description: `Downloaded ${filteredData.length} patient records with visit groups`,
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
          <HeaderMappingUpload 
            onMappingLoad={handleMappingLoad}
            hasExistingMapping={headerMappings.length > 0}
            mappingCount={headerMappings.length}
          />
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
                  searchQuery={searchQuery}
                  onPatientIdChange={setSelectedPatientId}
                  onSiteNameChange={setSelectedSiteName}
                  onSearchChange={setSearchQuery}
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
      columnName.includes('HEIGHT') || columnName.includes('WEIGHT') ||
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
