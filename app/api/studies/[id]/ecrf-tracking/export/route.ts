import { NextRequest } from 'next/server';

import { getStudyEcrfRollup } from '@/lib/actions/ecrf-rollup';
import {
  buildEcrfRollupCsv,
  studyEcrfRollupCsvFilename,
} from '@/lib/exporters/ecrf-rollup-csv';
import { createClient } from '@/lib/server';

export const runtime = 'nodejs';

/**
 * GET /api/studies/[id]/ecrf-tracking/export
 *
 * Returns the study-level eCRF rollup as a UTF-8 CSV with sectioned blocks
 * (Overall / By Site / By Visit / By Subject). Read-only — write-lock does
 * not block export. RLS on the underlying view enforces company scope.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: studyId } = await params;
  const supabase = await createClient();

  const { data: studyRow, error } = await supabase
    .from('studies')
    .select('id, protocol_number')
    .eq('id', studyId)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!studyRow) {
    return Response.json({ error: 'Study not found.' }, { status: 404 });
  }

  const protocolNumber =
    (studyRow as { protocol_number: string | null }).protocol_number ?? 'study';
  const bundle = await getStudyEcrfRollup(studyId);
  const csv = buildEcrfRollupCsv(bundle, {
    kind: 'study',
    label: `Study ${protocolNumber}`,
  });
  const filename = studyEcrfRollupCsvFilename(protocolNumber);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
