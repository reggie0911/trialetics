'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@phosphor-icons/react';
import {
  getResourceAssignments,
  getResourceCapacity,
  getResourceForecasts,
  getResourceUtilizationSummary,
} from '@/lib/actions/resources';
import { ResourceAssignmentTable } from './resource-assignment-table';
import { ResourceAssignmentDialog } from './resource-assignment-dialog';
import { ResourceCapacityView } from './resource-capacity-view';
import { ResourceForecastTable } from './resource-forecast-table';
import type {
  ResourceAssignment,
  ResourceCapacity,
  ResourceForecast,
  ResourceFilters,
} from '@/lib/types/resources';

interface ResourcesClientProps {
  companyId: string;
  profileId: string;
}

export function ResourcesClient({ companyId, profileId }: ResourcesClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [summary, setSummary] = useState<{
    total_staff: number;
    fully_allocated: number;
    partially_allocated: number;
    unallocated: number;
    avg_utilization_pct: number;
  } | null>(null);
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [assignmentsTotal, setAssignmentsTotal] = useState(0);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [capacity, setCapacity] = useState<ResourceCapacity[]>([]);
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [forecasts, setForecasts] = useState<ResourceForecast[]>([]);
  const [forecastsLoading, setForecastsLoading] = useState(false);
  const [filters, setFilters] = useState<ResourceFilters>({
    status: 'all',
    page: 1,
    pageSize: 25,
  });

  const loadSummary = useCallback(async () => {
    const res = await getResourceUtilizationSummary(companyId);
    if (res.success && res.data) {
      setSummary(res.data);
    }
  }, [companyId]);

  const loadAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    const reqFilters = { ...filters };
    if (filters.search) reqFilters.role = filters.search;
    const res = await getResourceAssignments(companyId, reqFilters);
    setAssignmentsLoading(false);
    if (res.success && res.data) {
      setAssignments(res.data.items);
      setAssignmentsTotal(res.data.total);
    }
  }, [companyId, filters]);

  const loadCapacity = useCallback(async () => {
    setCapacityLoading(true);
    const res = await getResourceCapacity(companyId, profileId || undefined);
    setCapacityLoading(false);
    if (res.success && res.data) {
      setCapacity(res.data);
    } else {
      setCapacity([]);
    }
  }, [companyId, profileId]);

  const loadForecasts = useCallback(async () => {
    setForecastsLoading(true);
    const res = await getResourceForecasts(companyId);
    setForecastsLoading(false);
    if (res.success && res.data) {
      setForecasts(res.data);
    } else {
      setForecasts([]);
    }
  }, [companyId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    loadCapacity();
  }, [loadCapacity]);

  useEffect(() => {
    loadForecasts();
  }, [loadForecasts]);

  const handleAssignmentSuccess = useCallback(() => {
    loadSummary();
    loadAssignments();
  }, [loadSummary, loadAssignments]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Staff</p>
          <p className="text-xl font-semibold">{summary?.total_staff ?? '—'}</p>
        </div>
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Fully Allocated</p>
          <p className="text-xl font-semibold">{summary?.fully_allocated ?? '—'}</p>
        </div>
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Partially Allocated</p>
          <p className="text-xl font-semibold">{summary?.partially_allocated ?? '—'}</p>
        </div>
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Unallocated</p>
          <p className="text-xl font-semibold">{summary?.unallocated ?? '—'}</p>
        </div>
        <div className="rounded-lg border bg-white p-3 text-center">
          <p className="text-xs text-muted-foreground">Avg Utilization %</p>
          <p className="text-xl font-semibold">
            {summary?.avg_utilization_pct != null ? `${summary.avg_utilization_pct}%` : '—'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="assignments">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="capacity">Capacity</TabsTrigger>
            <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          </TabsList>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="gap-1.5"
          >
            <PlusIcon className="size-4" />
            Create Assignment
          </Button>
        </div>

        <TabsContent value="assignments" className="mt-4">
          <ResourceAssignmentTable
            items={assignments}
            total={assignmentsTotal}
            isLoading={assignmentsLoading}
            filters={filters}
            onFiltersChange={setFilters}
            onSelect={() => {}}
          />
        </TabsContent>

        <TabsContent value="capacity" className="mt-4">
          <ResourceCapacityView items={capacity} isLoading={capacityLoading} />
        </TabsContent>

        <TabsContent value="forecasts" className="mt-4">
          <ResourceForecastTable items={forecasts} isLoading={forecastsLoading} />
        </TabsContent>
      </Tabs>

      <ResourceAssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleAssignmentSuccess}
      />
    </div>
  );
}
