"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from "recharts";
import { X } from "lucide-react";

interface VWCategoriesChartProps {
  data: Array<{ [key: string]: string | undefined }>;
  selectedCategory?: string;
  onCategoryClick?: (category: string | undefined) => void;
}

// Alert status colors
const ALERT_COLORS: Record<string, string> = {
  "GREEN": "hsl(142, 76%, 36%)", // Green
  "YELLOW": "hsl(48, 96%, 53%)", // Yellow
  "RED": "hsl(0, 84%, 60%)", // Red
};

export function VWCategoriesChart({ data, selectedCategory, onCategoryClick }: VWCategoriesChartProps) {
  // Group data by alert status and count occurrences
  const chartData = useMemo(() => {
    const categoryCounts = new Map<string, number>();

    data.forEach((row) => {
      const category = row.AlertStatus;
      if (category && category.trim() !== "") {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
    });

    // Convert to array and sort by alert level (GREEN, YELLOW, RED)
    const sortOrder = ["GREEN", "YELLOW", "RED"];
    const sortedData = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({
        category,
        count,
      }))
      .sort((a, b) => {
        const aIndex = sortOrder.indexOf(a.category);
        const bIndex = sortOrder.indexOf(b.category);
        return aIndex - bIndex;
      });

    return sortedData;
  }, [data]);

  const chartConfig = {
    count: {
      label: "Count",
      color: "hsl(var(--chart-1))",
    },
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Visit Window Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-[11px] text-muted-foreground">
            No alert status data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleBarClick = (data: { category: string; count: number } | null) => {
    if (!data || !onCategoryClick) return;
    
    // Toggle selection: if clicking the same category, clear it
    if (selectedCategory === data.category) {
      onCategoryClick(undefined);
    } else {
      onCategoryClick(data.category);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Visit Window Alerts</CardTitle>
          {selectedCategory && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                Filtered by: <span className="font-medium text-foreground">{selectedCategory}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onCategoryClick?.(undefined)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
              onClick={(e) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  handleBarClick(e.activePayload[0].payload);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="category"
                angle={0}
                textAnchor="middle"
                height={40}
                interval={0}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={ALERT_COLORS[entry.category] || "hsl(var(--chart-1))"}
                    opacity={selectedCategory ? (entry.category === selectedCategory ? 1 : 0.3) : 1}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
