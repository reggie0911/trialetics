"use client";

import { DocumentAggregations } from "@/lib/actions/document-management-data";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface DocumentKPISectionProps {
  metrics: DocumentAggregations;
  onChartClick?: (status: string) => void;
}

export function DocumentKPISection({ metrics, onChartClick }: DocumentKPISectionProps) {
  // Use documentsByStatus if available, otherwise fall back to aggregated metrics
  const chartData = metrics.documentsByStatus && metrics.documentsByStatus.length > 0
    ? metrics.documentsByStatus.map((item) => ({
        name: item.status,
        value: item.count,
        color: item.fill || "#3b82f6",
        status: item.status,
      }))
    : [
        {
          name: "Total",
          value: metrics.totalDocuments,
          color: "#3b82f6", // blue-500
          status: "",
        },
        {
          name: "Approved",
          value: metrics.approvedDocuments,
          color: "#10b981", // emerald-500
          status: "Approved",
        },
        {
          name: "Pending",
          value: metrics.documentsPendingApproval,
          color: "#f59e0b", // amber-500
          status: "Pending",
        },
        {
          name: "Expired",
          value: metrics.expiredDocuments,
          color: "#ef4444", // red-500
          status: "Expired",
        },
      ];

  const handleBarClick = (entry: typeof chartData[0]) => {
    if (onChartClick && entry) {
      onChartClick(entry.status || "");
    }
  };

  const chartConfig = {
    value: {
      label: "Count",
    },
  };

  const handleReset = () => {
    if (onChartClick) {
      onChartClick("");
    }
  };

  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Document Status</h3>
        {onChartClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            title="Reset filters"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  onClick={() => handleBarClick(entry)}
                  style={{ cursor: onChartClick ? 'pointer' : 'default' }}
                />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                style={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
