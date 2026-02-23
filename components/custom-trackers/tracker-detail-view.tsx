'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Plus } from 'lucide-react';
import { getCustomFields } from '@/lib/actions/custom-trackers';
import type { CustomTrackerDefinition, CustomField } from '@/lib/types/custom-trackers';
import { FIELD_TYPE_LABELS } from '@/lib/types/custom-trackers';
import { TrackerDataTable } from './tracker-data-table';
import { AddFieldDialog } from './add-field-dialog';

interface TrackerDetailViewProps {
  tracker: CustomTrackerDefinition;
  companyId: string;
  onBack: () => void;
}

export function TrackerDetailView({
  tracker,
  companyId,
  onBack,
}: TrackerDetailViewProps) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFields = useCallback(async () => {
    setLoading(true);
    const res = await getCustomFields(companyId, tracker.id);
    setLoading(false);
    if (res.success && res.data) {
      setFields(res.data);
    }
  }, [companyId, tracker.id]);

  useEffect(() => {
    loadFields();
  }, [loadFields]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h2 className="text-lg font-medium">{tracker.name}</h2>
        </div>
        <Button size="sm" onClick={() => setAddFieldOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Add Field
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Field Definitions</h3>
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">No fields yet. Add a field to get started.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Label</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Required</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-xs">{f.field_label}</TableCell>
                  <TableCell className="text-xs">{FIELD_TYPE_LABELS[f.field_type]}</TableCell>
                  <TableCell className="text-xs">{f.required ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Data</h3>
        <TrackerDataTable
          trackerId={tracker.id}
          fields={fields}
          companyId={companyId}
        />
      </div>

      <AddFieldDialog
        open={addFieldOpen}
        onOpenChange={setAddFieldOpen}
        trackerDefinitionId={tracker.id}
        onSuccess={loadFields}
      />
    </div>
  );
}
