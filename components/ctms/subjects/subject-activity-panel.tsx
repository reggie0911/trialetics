'use client';

import { useMemo, useState } from 'react';
import { Download, History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SUBJECT_ACTIVITY_KIND_OPTIONS,
  SUBJECT_CRF_METRIC_EVENT_FIELDS,
  SUBJECT_CRF_METRIC_EVENT_FIELD_LABELS,
  SUBJECT_VISIT_EVENT_FIELDS,
  SUBJECT_VISIT_EVENT_FIELD_LABELS,
  type SubjectActivityKind,
  type SubjectCrfMetricEventField,
  type SubjectVisitEventField,
} from '@/lib/types/ctms';

import { SubjectActivityEventsTable } from './subject-activity-events-table';

type FieldFilter =
  | { kind: 'crf'; field: SubjectCrfMetricEventField }
  | { kind: 'visit'; field: SubjectVisitEventField };

const ALL_VALUE = '__all__';

export interface SubjectActivityPanelProps {
  subjectId: string;
  /** Required to build the CSV export URL; omit to hide the Export CSV button. */
  studyId?: string;
}

export function SubjectActivityPanel({
  subjectId,
  studyId,
}: SubjectActivityPanelProps) {
  const [kind, setKind] = useState<SubjectActivityKind>('all');
  const [field, setField] = useState<FieldFilter | null>(null);

  // The Field selector lists CRF fields when kind === 'crf' or 'all', visit
  // fields when kind === 'visit' or 'all'. A grouped 'all' menu shows both.
  const fieldOptions = useMemo(() => {
    const opts: { value: string; label: string; group: 'CRF' | 'Visit' }[] = [];
    if (kind === 'all' || kind === 'crf') {
      for (const f of SUBJECT_CRF_METRIC_EVENT_FIELDS) {
        opts.push({
          value: `crf:${f}`,
          label: SUBJECT_CRF_METRIC_EVENT_FIELD_LABELS[f],
          group: 'CRF',
        });
      }
    }
    if (kind === 'all' || kind === 'visit') {
      for (const f of SUBJECT_VISIT_EVENT_FIELDS) {
        opts.push({
          value: `visit:${f}`,
          label: SUBJECT_VISIT_EVENT_FIELD_LABELS[f],
          group: 'Visit',
        });
      }
    }
    return opts;
  }, [kind]);

  // When kind changes, drop a field filter that's no longer in scope.
  const activeFieldValue =
    field === null
      ? ALL_VALUE
      : field.kind === 'crf'
        ? `crf:${field.field}`
        : `visit:${field.field}`;
  const isFieldStillValid = fieldOptions.some(
    (o) => o.value === activeFieldValue,
  );
  const fieldValue = isFieldStillValid ? activeFieldValue : ALL_VALUE;

  const exportHref = (() => {
    if (!studyId) return null;
    const params = new URLSearchParams();
    if (kind !== 'all') params.set('kind', kind);
    if (field !== null && isFieldStillValid) {
      if (field.kind === 'crf') params.set('crfField', field.field);
      else params.set('visitField', field.field);
    }
    const qs = params.toString();
    return `/api/studies/${studyId}/subjects/${subjectId}/activity/export${qs ? `?${qs}` : ''}`;
  })();

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Activity
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Audit trail of every CRF metric, query-status and visit timing
            change for this subject.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Show</span>
          <Select
            value={kind}
            onValueChange={(v) => {
              setKind(v as SubjectActivityKind);
              setField(null);
            }}
          >
            <SelectTrigger size="sm" className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUBJECT_ACTIVITY_KIND_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground">Field</span>
          <Select
            value={fieldValue}
            onValueChange={(v) => {
              if (v === ALL_VALUE) {
                setField(null);
                return;
              }
              const [k, f] = v.split(':') as [
                'crf' | 'visit',
                SubjectCrfMetricEventField | SubjectVisitEventField,
              ];
              if (k === 'crf') {
                setField({ kind: 'crf', field: f as SubjectCrfMetricEventField });
              } else {
                setField({
                  kind: 'visit',
                  field: f as SubjectVisitEventField,
                });
              }
            }}
          >
            <SelectTrigger size="sm" className="w-[220px]">
              <SelectValue
                placeholder="All fields"
                getDisplayLabel={(value) => {
                  if (value == null || value === ALL_VALUE) return 'All fields';
                  const opt = fieldOptions.find((o) => o.value === value);
                  return opt?.label ?? String(value);
                }}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All fields</SelectItem>
              {fieldOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="text-muted-foreground mr-1 text-[10px] uppercase tracking-wide">
                    {opt.group}
                  </span>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {exportHref && (
            <Button asChild variant="outline" size="sm">
              <a href={exportHref} download>
                <Download className="mr-1 h-3.5 w-3.5" />
                Export CSV
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <SubjectActivityEventsTable
          subjectId={subjectId}
          kind={kind}
          crfField={field?.kind === 'crf' ? field.field : undefined}
          visitField={field?.kind === 'visit' ? field.field : undefined}
          defaultPageSize={25}
        />
      </CardContent>
    </Card>
  );
}
