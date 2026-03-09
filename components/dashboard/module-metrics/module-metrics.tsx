'use client';

import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { MetricCard } from './metric-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { DashboardModuleMetric } from '@/lib/types/dashboard-metrics';

const STORAGE_KEY = 'dashboard-hidden-modules';

const ALL_MODULE_IDS = [
  'ae-metrics',
  'med-compliance',
  'visit-window',
  'ecrf-query-tracker',
  'sdv-tracker',
];

function loadHidden(allIds: string[]): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) return new Set(JSON.parse(raw));
  } catch {}
  return new Set(allIds);
}

function saveHidden(hidden: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...hidden]));
}

interface ModuleMetricsProps {
  metrics: DashboardModuleMetric[];
}

export function ModuleMetrics({ metrics }: ModuleMetricsProps) {
  const [hiddenModules, setHiddenModules] = useState<Set<string>>(new Set(ALL_MODULE_IDS));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setHiddenModules(loadHidden(ALL_MODULE_IDS));
    setMounted(true);
  }, []);

  const toggleModule = (id: string) => {
    setHiddenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveHidden(next);
      return next;
    });
  };

  const visibleMetrics = mounted
    ? metrics.filter((m) => !hiddenModules.has(m.id))
    : [];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Module Metrics</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => setSettingsOpen(true)}
          title="Manage visible modules"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {visibleMetrics.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-md">
          All modules are hidden. Click the settings icon to show modules.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {visibleMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Manage Visible Modules</DialogTitle>
            <DialogDescription className="text-xs">
              Toggle modules on or off to customize your dashboard view.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Trackers
              </h3>
              {metrics.map((metric) => (
                <div key={metric.id} className="flex items-center justify-between py-1">
                  <Label htmlFor={`toggle-${metric.id}`} className="text-sm cursor-pointer">
                    {metric.title}
                  </Label>
                  <Switch
                    id={`toggle-${metric.id}`}
                    checked={!hiddenModules.has(metric.id)}
                    onCheckedChange={() => toggleModule(metric.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
