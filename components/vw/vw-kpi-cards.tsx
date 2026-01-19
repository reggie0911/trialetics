"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface VWKPIMetrics {
  totalSubjects: number;
  activeFollowUps: number;
  alertRate: string;
}

export type VWKPIFilterType = "total" | "activeFollowUps" | null;

interface VWKPICardsProps {
  metrics: VWKPIMetrics;
  selectedFilter?: VWKPIFilterType;
  onCardClick?: (filterType: VWKPIFilterType) => void;
}

export function VWKPICards({ metrics, selectedFilter, onCardClick }: VWKPICardsProps) {
  const kpiItems: Array<{
    label: string;
    value: number | string;
    valueColor: string;
    filterKey: VWKPIFilterType;
  }> = [
    {
      label: "Total Enrolled Subjects",
      value: metrics.totalSubjects,
      valueColor: "text-foreground",
      filterKey: "total",
    },
    {
      label: "Subjects with Active Follow-Up Requirements",
      value: metrics.activeFollowUps,
      valueColor: "text-foreground",
      filterKey: "activeFollowUps",
    },
    {
      label: "Visit Alert Rate",
      value: metrics.alertRate,
      valueColor: "text-foreground",
      filterKey: null,
    },
  ];

  const handleCardClick = (filterKey: VWKPIFilterType) => {
    if (filterKey === null) return; // Alert rate is not clickable
    
    // Toggle: if already selected, deselect
    if (selectedFilter === filterKey) {
      onCardClick?.(null);
    } else {
      onCardClick?.(filterKey);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
