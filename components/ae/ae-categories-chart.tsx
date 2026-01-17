"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from "recharts";
import { X } from "lucide-react";

interface AECategoriesChartProps {
  data: Array<{ [key: string]: string | undefined }>;
  selectedCategory?: string;
  onCategoryClick?: (category: string | undefined) => void;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function AECategoriesChart({ data, selectedCategory, onCategoryClick }: AECategoriesChartProps) {
  // Group data by AEDECOD and count occurrences
  const chartData = useMemo(() => {
    const categoryCounts = new Map<string, number>();

    data.forEach((row) => {
      const category = row.AEDECOD;
      if (category && category.trim() !== "") {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
    });

    // Convert to array and sort by count descending
    const sortedData = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({
        category,
        count,
      }))
      .sort((a, b) => b.count - a.count);

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
          <CardTitle className="text-sm">AE Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-[11px] text-muted-foreground">
            No AE category data available
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
          <CardTitle className="text-sm">AE Categories</CardTitle>
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
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 20, bottom: 80 }}
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
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
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
