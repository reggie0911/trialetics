"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPIMetrics {
  totalAEs: number;
  totalSAEs: number;
  totalResolved: number;
  deaths: number;
  percentResolved: number;
}

export type KPIFilterType = "total" | "sae" | "resolved" | "death" | null;

interface AEKPICardsProps {
  metrics: KPIMetrics;
  selectedFilter?: KPIFilterType;
  onCardClick?: (filterType: KPIFilterType) => void;
}

export function AEKPICards({ metrics, selectedFilter, onCardClick }: AEKPICardsProps) {
  const kpiItems: Array<{
    label: string;
    value: number | string;
    valueColor: string;
    filterKey: KPIFilterType;
  }> = [
    {
      label: "Total AEs",
      value: metrics.totalAEs,
      valueColor: "text-foreground",
      filterKey: "total",
    },
    {
      label: "Total SAEs",
      value: metrics.totalSAEs,
      valueColor: "text-foreground",
      filterKey: "sae",
    },
    {
      label: "Total Resolved",
      value: metrics.totalResolved,
      valueColor: "text-foreground",
      filterKey: "resolved",
    },
    {
      label: "Death",
      value: metrics.deaths,
      valueColor: "text-foreground",
      filterKey: "death",
    },
    {
      label: "% Resolved",
      value: `${metrics.percentResolved}%`,
      valueColor: "text-foreground",
      filterKey: null, // % Resolved is informational only, no filter
    },
  ];

  const handleCardClick = (filterKey: KPIFilterType) => {
    if (filterKey === null) return; // % Resolved is not clickable
    
    // Toggle: if already selected, deselect
    if (selectedFilter === filterKey) {
      onCardClick?.(null);
    } else {
      onCardClick?.(filterKey);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpiItems.map((item, index) => (
        <Card 
          key={index} 
          className={cn(
            "border cursor-pointer transition-all duration-500 ease-in-out",
            item.filterKey !== null && "hover:bg-[#f000ff]/20",
            selectedFilter === item.filterKey && item.filterKey !== null && "bg-[#f000ff]/20 ring-2 ring-[#f000ff]",
            item.filterKey === null && "cursor-default"
          )}
          onClick={() => handleCardClick(item.filterKey)}
        >
          <CardContent className="p-3 space-y-1">
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
