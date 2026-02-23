'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getTrackerData } from '@/lib/actions/custom-trackers';
import type { CustomField, CustomFieldValue } from '@/lib/types/custom-trackers';

interface TrackerDataTableProps {
  trackerId: string;
  fields: CustomField[];
  companyId: string;
}

function getDisplayValue(
  value: CustomFieldValue | undefined,
  fieldType: CustomField['field_type']
): string {
  if (!value) return '';
  switch (fieldType) {
    case 'text':
    case 'url':
      return value.value_text ?? '';
    case 'number':
      return value.value_number != null ? String(value.value_number) : '';
    case 'date':
      return value.value_date ?? '';
    case 'boolean':
      return value.value_boolean === true ? 'Yes' : value.value_boolean === false ? 'No' : '';
    case 'select':
    case 'multiselect':
      return value.value_json != null ? JSON.stringify(value.value_json) : value.value_text ?? '';
    default:
      return value.value_text ?? '';
  }
}

export function TrackerDataTable({
  trackerId,
  fields,
  companyId,
}: TrackerDataTableProps) {
  const [entities, setEntities] = useState<string[]>([]);
  const [values, setValues] = useState<CustomFieldValue[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getTrackerData(companyId, trackerId);
    setLoading(false);
    if (res.success && res.data) {
      setEntities(res.data.entities);
      setValues(res.data.values);
    }
  }, [companyId, trackerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const valueMap = new Map<string, CustomFieldValue>();
  for (const v of values) {
    valueMap.set(`${v.entity_id}:${v.field_id}`, v);
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading…</p>;
  }

  if (entities.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
        No data
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Entity ID</TableHead>
            {fields.map((f) => (
              <TableHead key={f.id} className="text-xs">
                {f.field_label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entities.map((entityId) => (
            <TableRow key={entityId}>
              <TableCell className="text-xs font-mono">{entityId}</TableCell>
              {fields.map((f) => {
                const val = valueMap.get(`${entityId}:${f.id}`);
                return (
                  <TableCell key={f.id} className="text-xs">
                    {getDisplayValue(val, f.field_type)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
