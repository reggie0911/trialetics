"use client";

import { Card, CardContent } from "@/components/ui/card";

interface KPIMetrics {
  totalQueries: number;
  queriesPerSubject: string;
  queriesPerVisit: string;
  avgResolutionTime: number;
  openQueries: number;
  closedQueries: number;
  resolvedQueries: number;
  overdue: number;
  missingDataCount: number;
}

interface ECRFKPICardsProps {
  metrics: KPIMetrics;
}

export function ECRFKPICards({ metrics }: ECRFKPICardsProps) {
  const kpiItems: Array<{
    label: string;
    value: number | string;
    valueColor: string;
    description?: string;
  }> = [
    {
      label: "Total Queries",
      value: metrics.totalQueries,
      valueColor: "text-foreground",
    },
    {
      label: "Open Queries",
      value: metrics.openQueries,
      valueColor: "text-foreground",
    },
    {
      label: "Closed Queries",
      value: metrics.closedQueries,
      valueColor: "text-foreground",
    },
    {
      label: "Resolved Queries",
      value: metrics.resolvedQueries,
      valueColor: "text-green-600",
    },
    {
      label: "Overdue (>30 days)",
      value: metrics.overdue,
      valueColor: "text-red-600",
    },
    {
      label: "Queries per Subject",
      value: metrics.queriesPerSubject,
      valueColor: "text-foreground",
    },
    {
      label: "Queries per Visit",
      value: metrics.queriesPerVisit,
      valueColor: "text-foreground",
    },
    {
      label: "Missing Data",
      value: metrics.missingDataCount,
      valueColor: "text-foreground",
    },
    {
      label: "Avg Resolution Time",
      value: `${metrics.avgResolutionTime} days`,
      valueColor: "text-foreground",
      description: "Average days to resolve queries",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpiItems.map((item, index) => (
        <Card 
          key={index} 
          className="border"
        >
          <CardContent className="p-3 space-y-1 text-center">
            <p className="text-[11px] text-muted-foreground font-medium">
              {item.label}
            </p>
            <p className={`text-2xl font-semibold ${item.valueColor}`}>
              {item.value}
            </p>
            {item.description && (
              <p className="text-[10px] text-muted-foreground">
                {item.description}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
