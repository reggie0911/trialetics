import { NextRequest } from 'next/server';

import { getSubjectActivityEvents } from '@/lib/actions/subject-activity-events';
import {
  buildSubjectActivityEventsCsv,
  subjectActivityEventsCsvFilename,
} from '@/lib/exporters/subject-activity-events-csv';
import { createClient } from '@/lib/server';
import {
  SUBJECT_CRF_METRIC_EVENT_FIELDS,
  SUBJECT_VISIT_EVENT_FIELDS,
  type SubjectActivityEvent,
  type SubjectActivityKind,
  type SubjectCrfMetricEventField,
  type SubjectVisitEventField,
} from '@/lib/types/ctms';

export const runtime = 'nodejs';

const MAX_ROWS = 5000;
const PAGE_SIZE = 200;

function parseKind(raw: string | null): SubjectActivityKind {
  if (raw === 'crf' || raw === 'visit' || raw === 'all') return raw;
  return 'all';
}

function parseCrfField(raw: string | null): SubjectCrfMetricEventField | undefined {
  if (!raw) return undefined;
  return (SUBJECT_CRF_METRIC_EVENT_FIELDS as readonly string[]).includes(raw)
    ? (raw as SubjectCrfMetricEventField)
    : undefined;
}

function parseVisitField(raw: string | null): SubjectVisitEventField | undefined {
  if (!raw) return undefined;
  return (SUBJECT_VISIT_EVENT_FIELDS as readonly string[]).includes(raw)
    ? (raw as SubjectVisitEventField)
    : undefined;
}

/**
 * GET /api/studies/[id]/subjects/[subjectId]/activity/export
 *
 * Query params:
 *   ?kind=all|crf|visit         (default: all)
 *   ?crfField=<crf event field>  (only applies when kind in ['all','crf'])
 *   ?visitField=<visit event field> (only applies when kind in ['all','visit'])
 *
 * Returns the merged audit feed as a UTF-8 CSV mirroring whatever filters
 * are active on the Activity tab. Pages through the action up to MAX_ROWS so
 * very large logs don't OOM the function.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subjectId: string }> },
) {
  const { id: studyId, subjectId } = await params;
  const supabase = await createClient();

  const { data: subjectRow, error } = await supabase
    .from('subjects')
    .select('id, subject_number, study_id')
    .eq('id', subjectId)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!subjectRow || (subjectRow as { study_id: string }).study_id !== studyId) {
    return Response.json(
      { error: 'Subject not found in this study.' },
      { status: 404 },
    );
  }

  const sp = request.nextUrl.searchParams;
  const kind = parseKind(sp.get('kind'));
  const crfField = parseCrfField(sp.get('crfField') ?? sp.get('field'));
  const visitField = parseVisitField(sp.get('visitField'));

  const events: SubjectActivityEvent[] = [];
  let offset = 0;
  while (events.length < MAX_ROWS) {
    const { events: page, total } = await getSubjectActivityEvents({
      subjectId,
      kind,
      crfField,
      visitField,
      limit: PAGE_SIZE,
      offset,
    });
    events.push(...page);
    if (page.length < PAGE_SIZE) break;
    if (events.length >= total) break;
    offset += PAGE_SIZE;
  }

  const csv = buildSubjectActivityEventsCsv(events.slice(0, MAX_ROWS));
  const filename = subjectActivityEventsCsvFilename(
    (subjectRow as { subject_number: string }).subject_number,
  );

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
