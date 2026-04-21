import { NextRequest } from 'next/server';

import { getSiteEcrfRollup } from '@/lib/actions/ecrf-rollup';
import {
  buildEcrfRollupCsv,
  siteEcrfRollupCsvFilename,
} from '@/lib/exporters/ecrf-rollup-csv';
import { createClient } from '@/lib/server';

export const runtime = 'nodejs';

/**
 * GET /api/studies/[id]/sites/[siteId]/ecrf-tracking/export
 *
 * Site-scoped CSV export of the eCRF rollup. Defensively validates that the
 * resolved site's `study_id` matches the URL `[id]` so a CRA cannot exfiltrate
 * a sibling study's site by URL guessing.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; siteId: string }> },
) {
  const { id: studyId, siteId } = await params;
  const supabase = await createClient();

  const [studyRes, siteRes] = await Promise.all([
    supabase
      .from('studies')
      .select('id, protocol_number')
      .eq('id', studyId)
      .maybeSingle(),
    supabase
      .from('study_sites')
      .select('id, site_number, name, study_id')
      .eq('id', siteId)
      .maybeSingle(),
  ]);

  if (studyRes.error) {
    return Response.json({ error: studyRes.error.message }, { status: 500 });
  }
  if (siteRes.error) {
    return Response.json({ error: siteRes.error.message }, { status: 500 });
  }

  const studyRow = studyRes.data as { protocol_number: string | null } | null;
  const siteRow = siteRes.data as
    | { id: string; site_number: string; name: string | null; study_id: string }
    | null;

  if (!studyRow || !siteRow) {
    return Response.json({ error: 'Site not found.' }, { status: 404 });
  }
  if (siteRow.study_id !== studyId) {
    return Response.json(
      { error: 'Site does not belong to this study.' },
      { status: 404 },
    );
  }

  const protocolNumber = studyRow.protocol_number ?? 'study';
  const bundle = await getSiteEcrfRollup(siteId);
  const csv = buildEcrfRollupCsv(bundle, {
    kind: 'site',
    label: `Site ${siteRow.site_number}${siteRow.name ? ` — ${siteRow.name}` : ''}`,
  });
  const filename = siteEcrfRollupCsvFilename(protocolNumber, siteRow.site_number);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
