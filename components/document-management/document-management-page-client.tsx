"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Download } from "lucide-react";
import { DocumentRecord } from "./document-csv-upload-dialog";
import { DocumentViewerModal } from "./document-viewer-modal";
import { DocumentDataTable } from "./document-data-table";
import { DocumentFilters } from "./document-filters";
import { DocumentHeaderRelabelModal } from "./document-header-relabel-modal";
import { DocumentKPISection } from "./document-kpi-section";
import { useToast } from "@/hooks/use-toast";
import { 
  getDocumentHeaderMappings, 
  saveDocumentHeaderMappings,
  getDocumentUploads,
  uploadDocumentData,
  getDocumentRecords,
  deleteDocumentUpload,
  getDocumentFilterOptions,
  getDocumentAggregations,
  DocumentFilters as DocumentFiltersType,
  DocumentAggregations,
} from "@/lib/actions/document-management-data";
import { ColumnFiltersState } from "@tanstack/react-table";
import { Tables } from "@/lib/types/database.types";

interface DocumentManagementPageClientProps {
  companyId: string;
  profileId: string;
}

export function DocumentManagementPageClient({ companyId, profileId }: DocumentManagementPageClientProps) {
  // Upload management
  const [uploads, setUploads] = useState<Tables<'document_uploads'>[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  
  // Data state
  const [data, setData] = useState<DocumentRecord[]>([]);
  const [aggregations, setAggregations] = useState<DocumentAggregations | null>(null);
  const [filterOptions, setFilterOptions] = useState<{
    documentTypes: string[];
    statuses: string[];
    siteNames: string[];
    projectIds: string[];
  } | null>(null);
  const [headerMappings, setHeaderMappings] = useState<Record<string, string>>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [filters, setFilters] = useState<DocumentFiltersType>({
    documentName: "",
    documentType: "",
    status: "",
    siteName: "",
    projectId: "",
    expirationStatus: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);

  // Default header labels
  const defaultHeaderLabels: Record<string, string> = {
    "DocumentName": "Document Name",
    "DocumentType": "Document Type",
    "DocumentCategory": "Category",
    "Version": "Version",
    "Status": "Status",
    "SiteName": "Site Name",
    "ProjectId": "Project ID",
    "UploadDate": "Upload Date",
    "ApprovalDate": "Approval Date",
    "ExpirationDate": "Expiration Date",
    "ApprovedBy": "Approved By",
    "FileUrl": "File URL",
    "FileSize": "File Size",
  };

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Document viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerFilePath, setViewerFilePath] = useState<string | null>(null);
  const [viewerFileName, setViewerFileName] = useState<string | undefined>(undefined);

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
    } else {
      setAggregations(null);
    }
  }, [selectedUploadId]);

  const loadHeaderMappings = async () => {
    const result = await getDocumentHeaderMappings(companyId);
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
    
    const result = await getDocumentUploads(companyId);
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

  const loadData = async (uploadId: string) => {
    setIsLoading(true);
    setLoadingMessage("Loading document records...");
    
    // Prepare active filters (only non-empty values)
    const activeFilters: DocumentFiltersType = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.trim() !== '' && value.toLowerCase() !== 'all') {
        activeFilters[key as keyof DocumentFiltersType] = value;
      }
    });
    
    const result = await getDocumentRecords(uploadId, currentPage, pageSize, activeFilters);
    
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
    const result = await getDocumentFilterOptions(uploadId);
    if (result.success && result.data) {
      setFilterOptions(result.data);
    }
  };

  const loadAggregations = async (uploadId: string) => {
    try {
      const result = await getDocumentAggregations(uploadId, {});
      if (result.success && result.data) {
        setAggregations(result.data);
      } else {
        console.error("Failed to load aggregations:", result.error);
        setAggregations(null);
      }
    } catch (error) {
      console.error("Error loading aggregations:", error);
      setAggregations(null);
    }
  };

  const handleSaveHeaderMappings = async (newMappings: Record<string, string>) => {
    const mappingsArray = Object.entries(newMappings).map(([original, customized], index) => ({
      originalHeader: original,
      customizedHeader: customized,
      tableOrder: index,
    }));

    const result = await saveDocumentHeaderMappings(companyId, mappingsArray);
    if (result.success) {
      setHeaderMappings(newMappings);
    } else {
      throw new Error(result.error || "Failed to save mappings");
    }
  };

  const handleUpload = async (newData: DocumentRecord[], fileName: string) => {
    setIsLoading(true);
    setLoadingMessage(`Uploading ${newData.length} document records...`);
    
    try {
      const columns = Object.keys(newData[0] || {});
      const columnConfigs = columns.map((col, index) => ({
        columnId: col,
        label: headerMappings[col] || col,
        tableOrder: index,
      }));

      const result = await uploadDocumentData(
        companyId,
        profileId,
        fileName,
        newData,
        columnConfigs
      );

      if (result.success && result.data) {
        toast({
          title: "Upload Successful",
          description: `Uploaded ${newData.length} document records`,
        });

        await loadUploads();
        setSelectedUploadId(result.data);
        if (result.data) {
          await loadAggregations(result.data);
        }
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload document data",
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
      documentName: "",
      documentType: "",
      status: "",
      siteName: "",
      projectId: "",
      expirationStatus: "",
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
    
    const result = await deleteDocumentUpload(uploadId);
    
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
      link.setAttribute('download', `document_management_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download successful",
        description: `Downloaded ${filteredData.length} document records`,
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
      documentName: "",
      documentType: "",
      status: "",
      siteName: "",
      projectId: "",
      expirationStatus: "",
    });
  };

  const handleDocumentUploadComplete = async () => {
    // Refresh uploads and data
    await loadUploads();
    if (selectedUploadId) {
      await loadData(selectedUploadId);
      await loadAggregations(selectedUploadId);
    }
  };

  const handleViewDocument = (filePath: string, fileName?: string) => {
    setViewerFilePath(filePath);
    setViewerFileName(fileName);
    setViewerOpen(true);
  };

  const handleChartClick = (status: string) => {
    if (status === 'total' || status === '') {
      // Clear all filters
      setFilters({
        documentName: "",
        documentType: "",
        status: "",
        siteName: "",
        projectId: "",
        expirationStatus: "",
      });
    } else {
      // Filter by the exact status value from the chart
      // The chart shows actual status values from the database, so use them directly
      setFilters({
        ...filters,
        status: status, // Use the exact status value from the chart
        expirationStatus: "", // Clear expiration filter when filtering by status
      });
    }
    // Reset to first page when filtering
    setCurrentPage(1);
  };

  // Filter data based on top filters
  const topFilteredData = useMemo(() => {
    let result = [...data];

    if (filters.documentName) {
      result = result.filter((row) => {
        const documentName = row.DocumentName || "";
        return documentName.toLowerCase().includes(filters.documentName!.toLowerCase());
      });
    }

    if (filters.documentType) {
      result = result.filter((row) => {
        const documentType = row.DocumentType || "";
        return documentType === filters.documentType;
      });
    }

    if (filters.status) {
      result = result.filter((row) => {
        const status = row.Status || "";
        return status === filters.status;
      });
    }

    if (filters.siteName) {
      result = result.filter((row) => {
        const siteName = row.SiteName || "";
        return siteName === filters.siteName;
      });
    }

    if (filters.projectId) {
      result = result.filter((row) => {
        const projectId = row.ProjectId || "";
        return projectId === filters.projectId;
      });
    }

    if (filters.expirationStatus) {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      result = result.filter((row) => {
        if (!row.ExpirationDate) return false;
        const expDate = new Date(row.ExpirationDate);
        
        if (filters.expirationStatus === 'expired') {
          return expDate < today;
        } else if (filters.expirationStatus === 'expiring_soon') {
          return expDate >= today && expDate <= thirtyDaysFromNow;
        } else if (filters.expirationStatus === 'not_expired') {
          return expDate > thirtyDaysFromNow;
        }
        return true;
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
          const cellValue = row[columnId as keyof DocumentRecord];
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
          <DocumentHeaderRelabelModal 
            currentMappings={headerMappings}
            onSave={handleSaveHeaderMappings}
            disabled={!companyId}
          />
          {data.length > 0 && filterOptions && (
            <DocumentFilters 
              filters={filters} 
              onFiltersChange={setFilters} 
              onResetAll={handleResetAllFilters}
              filterOptions={filterOptions}
            />
          )}
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

      {/* KPI Section */}
      {aggregations && (
        <DocumentKPISection metrics={aggregations} onChartClick={handleChartClick} />
      )}

      {data.length > 0 && (
        <>

          <DocumentDataTable
            data={filteredData}
            headerMappings={headerMappings}
            columnFilters={columnFilters}
            onColumnFiltersChange={setColumnFilters}
            currentPage={currentPage}
            pageSize={pageSize}
            totalRecords={totalRecords}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onViewDocument={handleViewDocument}
          />
        </>
      )}

      {data.length === 0 && selectedUploadId && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No document records found. Please upload a CSV file.
          </CardContent>
        </Card>
      )}

      {!selectedUploadId && uploads.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No document data available.
          </CardContent>
        </Card>
      )}

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        filePath={viewerFilePath}
        fileName={viewerFileName}
      />
    </div>
  );
}
