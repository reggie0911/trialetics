"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { SDVAggregations } from "@/lib/actions/sdv-tracker-data";

interface SDVKPICardsProps {
  metrics: SDVAggregations;
  reportDate: string | null;
}

export function SDVKPICards({ metrics, reportDate }: SDVKPICardsProps) {
  // KPI items configuration matching the reference image
  const kpiItems: Array<{
    label: string;
    value: number | string;
    type: "progress" | "card";
    valueColor?: string;
    subLabel?: string;
    isHighlighted?: boolean;
    highlightColor?: string;
  }> = [
    {
      label: "Source Data Verification %",
      value: metrics.sdvPercent,
      type: "progress",
    },
    {
      label: "Estimated Days Onsite",
      value: metrics.estimatedDaysOnsite,
      type: "card",
    },
    {
      label: "# of Sites",
      value: metrics.totalSites,
      type: "card",
    },
    {
      label: "# of Subjects",
      value: metrics.totalSubjects,
      type: "card",
    },
    {
      label: "# of Forms Expected",
      value: metrics.formsExpected.toLocaleString(),
      type: "card",
    },
    {
      label: "# of Forms Entered",
      value: metrics.formsEntered.toLocaleString(),
      type: "card",
    },
    {
      label: "# of Forms Verified",
      value: metrics.formsVerified.toLocaleString(),
      type: "card",
    },
    {
      label: "# Needing Verification",
      value: metrics.needingVerification.toLocaleString(),
      type: "card",
    },
  ];

  return (
    <Card className="border">
      <CardContent className="p-4">
        <p className="text-[11px] text-muted-foreground font-medium mb-3">Report Metrics</p>
        
        <div className="flex flex-wrap items-stretch gap-3">
          {/* Progress Bar KPI */}
          <div className="flex-shrink-0 min-w-[200px] flex flex-col justify-center bg-white rounded-md border p-3">
            <p className="text-[10px] text-muted-foreground font-medium mb-2 text-center">
              Source Data Verification %
            </p>
            <div className="relative w-full">
              <ProgressPrimitive.Root value={metrics.sdvPercent} className="w-full">
                <ProgressPrimitive.Track className="bg-gray-100 h-7 rounded-sm relative flex w-full items-center overflow-x-hidden">
                  <ProgressPrimitive.Indicator 
                    className="h-full transition-all"
                    style={{ backgroundColor: 'rgba(29, 174, 65, 0.7)' }}
                  />
                </ProgressPrimitive.Track>
              </ProgressPrimitive.Root>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-[12px] font-bold drop-shadow" style={{ color: '#000000' }}>
                  {metrics.sdvPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-border self-stretch" />

          {/* Card KPIs */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {kpiItems.slice(1).map((item, index) => (
              <div 
                key={index}
                className={`flex flex-col items-center justify-center p-3 rounded-md border h-full ${
                  item.isHighlighted ? item.highlightColor : 'bg-white'
                }`}
              >
                <p className="text-[10px] text-muted-foreground font-medium text-center leading-tight mb-1 h-8 flex items-center">
                  {item.label}
                </p>
                <p className={`text-lg font-semibold ${item.valueColor || 'text-foreground'}`}>
                  {item.value}
                </p>
                {item.subLabel && (
                  <p className={`text-[9px] ${item.valueColor || 'text-muted-foreground'}`}>
                    {item.subLabel}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px bg-border self-stretch" />

          {/* Report Date */}
          {reportDate && (
            <div className="flex-shrink-0 min-w-[120px] flex flex-col items-center justify-center">
              <p className="text-[10px] text-muted-foreground font-medium">
                Current Report Listed
              </p>
              <p className="text-sm font-semibold">
                {reportDate}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
