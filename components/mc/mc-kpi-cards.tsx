"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPIMetrics {
  totalMeds: number;
  missingStartDate: number;
  startDateUnknown: number;
  missingStopDate: number;
  missingDoseOrUnit: number;
  invalidFreq: number;
  partialData: number;
}

export type KPIFilterType = 
  | "total" 
  | "missingStartDate" 
  | "startDateUnknown" 
  | "missingStopDate" 
  | "missingDoseOrUnit" 
  | "invalidFrequency" 
  | "partialData" 
  | null;

interface MCKPICardsProps {
  metrics: KPIMetrics;
  selectedFilter?: KPIFilterType;
  onCardClick?: (filterType: KPIFilterType) => void;
}

export function MCKPICards({ metrics, selectedFilter, onCardClick }: MCKPICardsProps) {
  const kpiItems: Array<{
    label: string;
    value: number | string;
    valueColor: string;
    filterKey: KPIFilterType;
  }> = [
    {
      label: "Total Medications",
      value: metrics.totalMeds,
      valueColor: "text-foreground",
      filterKey: "total",
    },
    {
      label: "Missing Start Date",
      value: metrics.missingStartDate,
      valueColor: "text-foreground",
      filterKey: "missingStartDate",
    },
    {
      label: "Start Date Unknown Flag",
      value: metrics.startDateUnknown,
      valueColor: "text-foreground",
      filterKey: "startDateUnknown",
    },
    {
      label: "Missing Stop Date",
      value: metrics.missingStopDate,
      valueColor: "text-foreground",
      filterKey: "missingStopDate",
    },
    {
      label: "Missing Dose or Unit",
      value: metrics.missingDoseOrUnit,
      valueColor: "text-foreground",
      filterKey: "missingDoseOrUnit",
    },
    {
      label: "Invalid Frequency Entries",
      value: metrics.invalidFreq,
      valueColor: "text-foreground",
      filterKey: "invalidFrequency",
    },
    {
      label: "Med logs w/ Partial Data",
      value: metrics.partialData,
      valueColor: "text-foreground",
      filterKey: "partialData",
    },
  ];

  const handleCardClick = (filterKey: KPIFilterType) => {
    if (filterKey === null) return; // Should not happen with our data
    
    // Toggle: if already selected, deselect
    if (selectedFilter === filterKey) {
      onCardClick?.(null);
    } else {
      onCardClick?.(filterKey);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      {kpiItems.map((item, index) => (
        <Card 
          key={index} 
          className={cn(
            "border cursor-pointer transition-all duration-500 ease-in-out",
            item.filterKey !== null && "hover:bg-[#79D7BE]/20",
            selectedFilter === item.filterKey && item.filterKey !== null && "bg-[#79D7BE]/20 ring-2 ring-[#79D7BE]",
            item.filterKey === null && "cursor-default"
          )}
          onClick={() => handleCardClick(item.filterKey)}
        >
          <CardContent className="p-3 space-y-1 text-center">
            <p className="text-[11px] text-muted-foreground font-medium">
              {item.label}
            </p>
            <p className={`text-2xl font-semibold ${item.valueColor}`}>
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
