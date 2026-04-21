import { NextRequest } from 'next/server';

import { getSubjectEcrfTracking } from '@/lib/actions/subject-ecrf-tracking';
import {
  buildSubjectEcrfCsv,
  subjectEcrfCsvFilename,
} from '@/lib/exporters/subject-ecrf-csv';
import { createClient } from '@/lib/server';

export const runtime = 'nodejs';

/**
 * GET /api/studies/[id]/subjects/[subjectId]/ecrf/export
 *
 * Returns the subject's eCRF tracking matrix as a UTF-8 CSV. Read-only
 * (write-lock does not block export). Authorization is enforced by RLS on
 * the underlying subject_visits / subject_crfs tables, plus a study-scope
 * check on the subject row to avoid cross-study leakage.
 */
export async function GET(
  _request: NextRequest,
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

  const visits = await getSubjectEcrfTracking(subjectId);
  const csv = buildSubjectEcrfCsv(visits);
  const filename = subjectEcrfCsvFilename(
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
