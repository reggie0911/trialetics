"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from "recharts";
import { X } from "lucide-react";

const MAX_CATEGORY_TICK_CHARS = 40;

function truncateCategoryTick(value: string) {
  const v = String(value);
  if (v.length <= MAX_CATEGORY_TICK_CHARS) return v;
  return `${v.slice(0, MAX_CATEGORY_TICK_CHARS - 1)}…`;
}

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
  const { resolvedTheme } = useTheme();

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

  const yAxisWidth = useMemo(() => {
    if (chartData.length === 0) return 100;
    const longest = chartData.reduce((m, d) => Math.max(m, d.category.length), 0);
    const effectiveLen = Math.min(longest, MAX_CATEGORY_TICK_CHARS);
    return Math.min(340, Math.max(100, Math.round(effectiveLen * 5.4 + 28)));
  }, [chartData]);

  const chartHeight = useMemo(
    () => Math.min(720, Math.max(260, chartData.length * 28 + 56)),
    [chartData.length]
  );

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

  type BarCategoryPayload = { category: string; count: number };

  const handleBarClick = (data: BarCategoryPayload | null) => {
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
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full min-h-[260px]"
          style={{ height: chartHeight }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 12, right: 36, left: 8, bottom: 12 }}
              onClick={(e) => {
                const payload = (e as { activePayload?: Array<{ payload?: BarCategoryPayload }> })
                  .activePayload?.[0]?.payload;
                if (payload) handleBarClick(payload);
              }}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="category"
                width={yAxisWidth}
                reversed
                tick={{ fontSize: 10 }}
                tickFormatter={truncateCategoryTick}
                interval={0}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      resolvedTheme === "dark"
                        ? "#ffffff"
                        : CHART_COLORS[index % CHART_COLORS.length]
                    }
                    opacity={selectedCategory ? (entry.category === selectedCategory ? 1 : 0.3) : 1}
                    style={{ cursor: "pointer" }}
                  />
                ))}
                <LabelList
                  dataKey="count"
                  position="right"
                  style={{
                    fontSize: 10,
                    fill:
                      resolvedTheme === "dark"
                        ? "#ffffff"
                        : "hsl(var(--foreground))",
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
