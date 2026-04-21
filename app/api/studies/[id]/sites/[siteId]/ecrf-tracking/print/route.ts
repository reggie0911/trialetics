import { NextRequest } from 'next/server';

import { getSiteEcrfRollup } from '@/lib/actions/ecrf-rollup';
import { siteEcrfRollupPdfFilename } from '@/lib/exporters/ecrf-rollup-csv';
import { renderEcrfRollupPdf } from '@/lib/exporters/ecrf-rollup-pdf';
import { createClient } from '@/lib/server';
import { resolveEcrfPdfLogo } from '@/lib/server/ecrf-pdf-logo';

export const runtime = 'nodejs';

/**
 * GET /api/studies/[id]/sites/[siteId]/ecrf-tracking/print
 *
 * Site-scoped PDF export of the eCRF rollup. Same defensive study/site
 * matching as the CSV route, plus company-logo resolution mirroring the
 * per-subject `print` endpoint.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; siteId: string }> },
) {
  const { id: studyId, siteId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [studyRes, siteRes] = await Promise.all([
    supabase
      .from('studies')
      .select('id, study_name, protocol_number, company_id')
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

  const studyMeta = studyRes.data as
    | {
        id: string;
        study_name: string | null;
        protocol_number: string | null;
        company_id: string | null;
      }
    | null;
  const siteRow = siteRes.data as
    | { id: string; site_number: string; name: string | null; study_id: string }
    | null;

  if (!studyMeta || !siteRow) {
    return Response.json({ error: 'Site not found.' }, { status: 404 });
  }
  if (siteRow.study_id !== studyId) {
    return Response.json(
      { error: 'Site does not belong to this study.' },
      { status: 404 },
    );
  }

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
  const bundle = await getSiteEcrfRollup(siteId);

  const protocolNumber = studyMeta.protocol_number ?? 'study';
  const scopeLabel = `Site ${siteRow.site_number}${siteRow.name ? ` — ${siteRow.name}` : ''}`;
  const buf = await renderEcrfRollupPdf({
    scopeKind: 'site',
    scopeLabel,
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

  const filename = siteEcrfRollupPdfFilename(protocolNumber, siteRow.site_number);

  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
