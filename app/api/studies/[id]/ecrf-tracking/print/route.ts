import { NextRequest } from 'next/server';

import { getStudyEcrfRollup } from '@/lib/actions/ecrf-rollup';
import { studyEcrfRollupPdfFilename } from '@/lib/exporters/ecrf-rollup-csv';
import { renderEcrfRollupPdf } from '@/lib/exporters/ecrf-rollup-pdf';
import { createClient } from '@/lib/server';
import { resolveEcrfPdfLogo } from '@/lib/server/ecrf-pdf-logo';

export const runtime = 'nodejs';

/**
 * GET /api/studies/[id]/ecrf-tracking/print
 *
 * Returns the study-level eCRF rollup as a PDF (inline disposition so the
 * browser previews it). Mirrors the per-subject `print` route's auth + logo
 * resolution flow.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: studyId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: studyRow, error } = await supabase
    .from('studies')
    .select('id, study_name, protocol_number, company_id')
    .eq('id', studyId)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!studyRow) {
    return Response.json({ error: 'Study not found.' }, { status: 404 });
  }

  const studyMeta = studyRow as {
    id: string;
    study_name: string | null;
    protocol_number: string | null;
    company_id: string | null;
  };

  let companyName: string | null = null;
  let companyLogoUrl: string | null = null;
  if (studyMeta.company_id) {
    const { data: companyRow } = await supabase
      .from('companies')
      .select('name, logo_url')
      .eq('id', studyMeta.company_id)
      .maybeSingle();
    const c = companyRow as { name: string | null; logo_url: string | null } | null;
    companyName = c?.name ?? null;
    companyLogoUrl = c?.logo_url ?? null;
  }

  const logo = await resolveEcrfPdfLogo(companyLogoUrl);
  const bundle = await getStudyEcrfRollup(studyId);

  const protocolNumber = studyMeta.protocol_number ?? 'study';
  const buf = await renderEcrfRollupPdf({
    scopeKind: 'study',
    scopeLabel: `Study ${protocolNumber}`,
    study: {
      id: studyMeta.id,
      name: studyMeta.study_name ?? 'Study',
      protocol_id: studyMeta.protocol_number ?? null,
    },
    company: { name: companyName },
    logo,
    bundle,
    generatedAt: new Date(),
    generatedBy: user?.email ?? null,
  });

  const filename = studyEcrfRollupPdfFilename(protocolNumber);

  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
