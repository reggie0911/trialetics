"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AECSVUploadDialog, AERecord } from "./ae-csv-upload-dialog";
import { AEDataTable } from "./ae-data-table";
import { AEFilters } from "./ae-filters";
import { AEKPICards, KPIFilterType } from "./ae-kpi-cards";
import { AECategoriesChart } from "./ae-categories-chart";
import { AEHeaderRelabelModal } from "./ae-header-relabel-modal";
import { AEUploadHistory } from "./ae-upload-history";
import { useToast } from "@/hooks/use-toast";
import { 
  getAEHeaderMappings, 
  saveAEHeaderMappings,
  getAEUploads,
  uploadAEData,
  getAERecords,
  deleteAEUpload,
} from "@/lib/actions/ae-data";
import { ColumnFiltersState } from "@tanstack/react-table";
import { Tables } from "@/lib/types/database.types";
import { Loader2 } from "lucide-react";

interface AEPageClientProps {
  companyId: string;
  profileId: string;
}

export function AEPageClient({ companyId, profileId }: AEPageClientProps) {
  // Upload management
  const [uploads, setUploads] = useState<Tables<'ae_uploads'>[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  
  // Data state
  const [data, setData] = useState<AERecord[]>([]);
  const [headerMappings, setHeaderMappings] = useState<Record<string, string>>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [kpiFilter, setKpiFilter] = useState<KPIFilterType>(null);
  const [filters, setFilters] = useState({
    siteName: "",
    subjectId: "",
    aeDecod: "",
    aeSer: "",
    aeExp: "",
    aeOut: "",
    aeSerCat1: "",
  });

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

  // Load AE data when upload is selected
  useEffect(() => {
    if (selectedUploadId) {
      loadAEData(selectedUploadId);
    }
  }, [selectedUploadId]);

  const loadHeaderMappings = async () => {
    const result = await getAEHeaderMappings(companyId);
    if (result.success && result.data) {
      const mappings: Record<string, string> = {};
      result.data.forEach(mapping => {
        mappings[mapping.original_header] = mapping.customized_header;
      });
      setHeaderMappings(mappings);
    }
  };

  const loadUploads = async () => {
    setIsLoading(true);
    setLoadingMessage("Loading uploads...");
    
    const result = await getAEUploads(companyId);
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

  const loadAEData = async (uploadId: string) => {
    setIsLoading(true);
    setLoadingMessage("Loading AE records...");
    
    const result = await getAERecords(uploadId);
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

    const result = await saveAEHeaderMappings(companyId, mappingsArray);
    if (result.success) {
      setHeaderMappings(newMappings);
    } else {
      throw new Error(result.error || "Failed to save mappings");
    }
  };

  // Handle CSV upload - now uploads to Supabase
  const handleUpload = async (newData: AERecord[], fileName: string) => {
    setIsLoading(true);
    setLoadingMessage(`Uploading ${newData.length} AE records...`);
    
    try {
      // Prepare column configs
      const columns = Object.keys(newData[0] || {});
      const columnConfigs = columns.map((col, index) => ({
        columnId: col,
        label: headerMappings[col] || col,
        tableOrder: index,
      }));

      // Upload to Supabase
      const result = await uploadAEData(
        companyId,
        profileId,
        fileName,
        newData,
        columnConfigs
      );

      if (result.success && result.data) {
        toast({
          title: "Upload Successful",
          description: `Uploaded ${newData.length} adverse event records`,
        });

        // Reload uploads and select the new one
        await loadUploads();
        setSelectedUploadId(result.data);
      } else {
        toast({
          title: "Upload Failed",
          description: result.error || "Failed to upload AE data",
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
      aeDecod: "",
      aeSer: "",
      aeExp: "",
      aeOut: "",
      aeSerCat1: "",
    });
  };

  const handleUploadDelete = async (uploadId: string) => {
    setIsLoading(true);
    setLoadingMessage("Deleting upload...");
    
    const result = await deleteAEUpload(uploadId);
    
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

  // Handle chart category click - filters the table by AEDECOD
  const handleCategoryClick = (category: string | undefined) => {
    if (category) {
      // Add or update the AEDECOD filter
      setColumnFilters((prev) => {
        const existingFilterIndex = prev.findIndex((f) => f.id === "AEDECOD");
        if (existingFilterIndex >= 0) {
          const newFilters = [...prev];
          newFilters[existingFilterIndex] = { id: "AEDECOD", value: category };
          return newFilters;
        }
        return [...prev, { id: "AEDECOD", value: category }];
      });
    } else {
      // Remove the AEDECOD filter
      setColumnFilters((prev) => prev.filter((f) => f.id !== "AEDECOD"));
    }
  };

  // Get the currently selected category from column filters
  const selectedCategory = useMemo(() => {
    const aeDecodFilter = columnFilters.find((f) => f.id === "AEDECOD");
    return aeDecodFilter?.value as string | undefined;
  }, [columnFilters]);

  // Reset all filters (column filters, chart selection, and KPI filter)
  const handleResetAllFilters = () => {
    setColumnFilters([]);
    setKpiFilter(null);
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

    if (filters.aeDecod) {
      result = result.filter((row) => {
        const aeDecod = row.AEDECOD || "";
        return aeDecod.toLowerCase().includes(filters.aeDecod.toLowerCase());
      });
    }

    if (filters.aeSer) {
      result = result.filter((row) => {
        const aeSer = row.AESER || "";
        return aeSer.toLowerCase().includes(filters.aeSer.toLowerCase());
      });
    }

    if (filters.aeExp) {
      result = result.filter((row) => {
        const aeExp = row.AEEXP || "";
        return aeExp.toLowerCase().includes(filters.aeExp.toLowerCase());
      });
    }

    if (filters.aeOut) {
      result = result.filter((row) => {
        const aeOut = row.AEOUT || "";
        return aeOut.toLowerCase().includes(filters.aeOut.toLowerCase());
      });
    }

    if (filters.aeSerCat1) {
      result = result.filter((row) => {
        const aeSerCat1 = row.AESERCAT1 || "";
        return aeSerCat1.toLowerCase().includes(filters.aeSerCat1.toLowerCase());
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
          const cellValue = row[columnId as keyof AERecord];
          return cellValue === filterValue;
        });
      }
    });

    // Apply KPI filter
    if (kpiFilter) {
      switch (kpiFilter) {
        case "sae":
          result = result.filter((row) => 
            row.AESER && row.AESER.toUpperCase().includes("SERIOUS")
          );
          break;
        case "resolved":
          result = result.filter((row) => 
            row.AEOUT && row.AEOUT.toUpperCase().includes("RESOLVED")
          );
          break;
        case "death":
          result = result.filter((row) => 
            row.AESERCAT1 && row.AESERCAT1.toUpperCase().includes("DEATH")
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
  // This ensures KPI cards show total counts, not filtered counts
  const kpiMetrics = useMemo(() => {
    const totalAEs = topFilteredData.length;
    const totalSAEs = topFilteredData.filter(
      (row) => row.AESER && row.AESER.toUpperCase().includes("SERIOUS")
    ).length;
    const totalResolved = topFilteredData.filter(
      (row) => row.AEOUT && row.AEOUT.toUpperCase().includes("RESOLVED")
    ).length;
    const deaths = topFilteredData.filter(
      (row) =>
        row.AESERCAT1 && row.AESERCAT1.toUpperCase().includes("DEATH")
    ).length;
    const percentResolved =
      totalAEs > 0 ? Math.round((totalResolved / totalAEs) * 100) : 0;

    return {
      totalAEs,
      totalSAEs,
      totalResolved,
      deaths,
      percentResolved,
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
          <AECSVUploadDialog 
            onUpload={handleUpload}
            companyId={companyId}
            profileId={profileId}
          />
          <AEHeaderRelabelModal 
            currentMappings={headerMappings}
            onSave={handleSaveHeaderMappings}
            disabled={!companyId}
          />
          <AEUploadHistory
            uploads={uploads}
            selectedUploadId={selectedUploadId}
            onUploadSelect={handleUploadSelect}
            onUploadDelete={handleUploadDelete}
          />
        </div>
      </div>

      {/* Filters */}
      {data.length > 0 && (
        <>
          <AEFilters 
            filters={filters} 
            onFiltersChange={setFilters} 
            onResetAll={handleResetAllFilters}
            data={data} 
          />

          {/* KPI Cards */}
          <AEKPICards 
            metrics={kpiMetrics} 
            selectedFilter={kpiFilter}
            onCardClick={handleKpiCardClick}
          />

          {/* AE Categories Chart */}
          <AECategoriesChart 
            data={filteredData} 
            selectedCategory={selectedCategory}
            onCategoryClick={handleCategoryClick}
          />

          {/* Data Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Adverse Events</CardTitle>
            </CardHeader>
            <CardContent>
              <AEDataTable 
                data={filteredData} 
                headerMappings={headerMappings}
                columnFilters={columnFilters}
                onColumnFiltersChange={setColumnFilters}
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
