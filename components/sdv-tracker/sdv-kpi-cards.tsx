'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  FileSpreadsheet, 
  Percent, 
  Building2, 
  Users,
  AlertCircle
} from 'lucide-react';
import type { SDVAggregations } from '@/lib/actions/sdv-tracker';

interface SDVKPICardsProps {
  aggregations: SDVAggregations | null;
  isLoading: boolean;
}

export function SDVKPICards({ aggregations, isLoading }: SDVKPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!aggregations) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No data available. Upload CSV files to see metrics.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getSDVPercentColor = (percent: number) => {
    if (percent >= 80) return 'text-green-600 dark:text-green-400';
    if (percent >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* SDV Percent - Primary KPI */}
      <Card className="border-l-4 border-l-primary max-w-[320px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">% SDV Complete</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${getSDVPercentColor(aggregations.sdv_percent)}`}>
            {Math.round(aggregations.sdv_percent)}%
          </div>
          <p className="text-xs text-muted-foreground">
            {aggregations.verified_items.toLocaleString()} of {aggregations.total_items.toLocaleString()} items verified
          </p>
        </CardContent>
      </Card>

      {/* Total Items */}
      <Card className="max-w-[320px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {aggregations.total_items.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Across {aggregations.total_sites} sites, {aggregations.total_subjects} subjects
          </p>
        </CardContent>
      </Card>

      {/* Verified Items */}
      <Card className="max-w-[320px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Verified Items</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {aggregations.verified_items.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Items with SDV completed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Compact version for use in filters area
export function SDVKPICardsMini({ aggregations, isLoading }: SDVKPICardsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-24" />
      </div>
    );
  }

  if (!aggregations) {
    return null;
  }

  const getSDVPercentColor = (percent: number) => {
    if (percent >= 80) return 'text-green-600 dark:text-green-400';
    if (percent >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <Percent className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">SDV:</span>
        <span className={`font-bold ${getSDVPercentColor(aggregations.sdv_percent)}`}>
          {Math.round(aggregations.sdv_percent)}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Items:</span>
        <span className="font-medium">{aggregations.total_items.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Sites:</span>
        <span className="font-medium">{aggregations.total_sites}</span>
      </div>
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Subjects:</span>
        <span className="font-medium">{aggregations.total_subjects}</span>
      </div>
    </div>
  );
}
