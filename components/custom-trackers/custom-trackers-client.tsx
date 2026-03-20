'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ArrowLeft } from 'lucide-react';
import { getTrackerDefinitions, getCustomFields } from '@/lib/actions/custom-trackers';
import type { CustomTrackerDefinition } from '@/lib/types/custom-trackers';
import { TrackerDefinitionDialog } from './tracker-definition-dialog';
import { TrackerDetailView } from './tracker-detail-view';

interface CustomTrackersClientProps {
  companyId: string;
  profileId: string;
  initialTrackerId?: string | null;
}

export function CustomTrackersClient({ companyId, profileId, initialTrackerId }: CustomTrackersClientProps) {
  const [trackers, setTrackers] = useState<CustomTrackerDefinition[]>([]);
  const [fieldCounts, setFieldCounts] = useState<Record<string, number>>({});
  const [selectedTracker, setSelectedTracker] = useState<CustomTrackerDefinition | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [defsRes, fieldsRes] = await Promise.all([
      getTrackerDefinitions(companyId),
      getCustomFields(companyId),
    ]);
    setLoading(false);
    if (defsRes.success && defsRes.data) {
      setTrackers(defsRes.data.items);
    }
    if (fieldsRes.success && fieldsRes.data) {
      const counts: Record<string, number> = {};
      for (const f of fieldsRes.data) {
        counts[f.tracker_definition_id] = (counts[f.tracker_definition_id] ?? 0) + 1;
      }
      setFieldCounts(counts);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!initialTrackerId || loading) return;
    const match = trackers.find((t) => t.id === initialTrackerId);
    if (match) {
      setSelectedTracker(match);
    }
  }, [initialTrackerId, trackers, loading]);

  const handleTrackerSelect = (tracker: CustomTrackerDefinition) => {
    setSelectedTracker(tracker);
  };

  const handleBack = () => {
    setSelectedTracker(null);
  };

  if (selectedTracker) {
    return (
      <TrackerDetailView
        tracker={selectedTracker}
        companyId={companyId}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Custom Trackers</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Tracker
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trackers.map((tracker) => (
            <button
              key={tracker.id}
              type="button"
              onClick={() => handleTrackerSelect(tracker)}
              className="rounded-lg border bg-white p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{tracker.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {tracker.description || 'No description'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {fieldCounts[tracker.id] ?? 0} field{fieldCounts[tracker.id] !== 1 ? 's' : ''}
                  </p>
                </div>
                {tracker.active && (
                  <Badge variant="secondary" className="shrink-0">Active</Badge>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <TrackerDefinitionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadData}
      />
    </div>
  );
}
