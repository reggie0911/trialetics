import { NextRequest } from 'next/server';

import {
  buildSubjectVisitsCsv,
  subjectVisitsCsvFilename,
} from '@/lib/exporters/subject-visits-csv';
import { createClient } from '@/lib/server';
import type { SubjectVisit } from '@/lib/types/ctms';

export const runtime = 'nodejs';

/**
 * GET /api/studies/[id]/subjects/[subjectId]/visits/export
 *
 * Returns the subject's visit schedule as a UTF-8 CSV. Read-only -
 * write-lock does NOT block export. Authorization piggybacks on RLS for
 * the underlying subject_visits rows, plus a study-scope check on the
 * subject row to prevent cross-study URL guessing.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; subjectId: string }> },
) {
  const { id: studyId, subjectId } = await params;
  const supabase = await createClient();

  const { data: subjectRow, error: subjectError } = await supabase
    .from('subjects')
    .select('id, subject_number, study_id')
    .eq('id', subjectId)
    .maybeSingle();

  if (subjectError) {
    return Response.json({ error: subjectError.message }, { status: 500 });
  }
  if (!subjectRow || (subjectRow as { study_id: string }).study_id !== studyId) {
    return Response.json(
      { error: 'Subject not found in this study.' },
      { status: 404 },
    );
  }

  const { data: visits, error: visitsError } = await supabase
    .from('subject_visits')
    .select('*')
    .eq('subject_id', subjectId)
    .order('sort_order', { ascending: true })
    .order('visit_number', { ascending: true });

  if (visitsError) {
    return Response.json({ error: visitsError.message }, { status: 500 });
  }

  const csv = buildSubjectVisitsCsv((visits ?? []) as unknown as SubjectVisit[]);
  const filename = subjectVisitsCsvFilename(
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
