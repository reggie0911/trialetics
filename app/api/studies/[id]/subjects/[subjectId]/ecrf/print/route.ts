import { NextRequest } from 'next/server';

import { getSubjectEcrfTracking } from '@/lib/actions/subject-ecrf-tracking';
import { subjectEcrfPdfFilename } from '@/lib/exporters/subject-ecrf-csv';
import { renderSubjectEcrfPdf } from '@/lib/exporters/subject-ecrf-pdf';
import { createClient } from '@/lib/server';
import { resolveEcrfPdfLogo } from '@/lib/server/ecrf-pdf-logo';

export const runtime = 'nodejs';

/**
 * GET /api/studies/[id]/subjects/[subjectId]/ecrf/print
 *
 * Returns the subject's eCRF tracking matrix as a human-readable PDF (inline
 * disposition so the browser previews it). Read-only — write-lock does NOT
 * block export. Authorization piggybacks on RLS for the underlying data.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; subjectId: string }> },
) {
  const { id: studyId, subjectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [studyRes, subjectRes] = await Promise.all([
    supabase
      .from('studies')
      .select('id, study_name, protocol_number, company_id')
      .eq('id', studyId)
      .maybeSingle(),
    supabase
      .from('subjects')
      .select('id, subject_number, status, study_id, study_sites(site_number, name)')
      .eq('id', subjectId)
      .maybeSingle(),
  ]);

  if (studyRes.error) {
    return Response.json({ error: studyRes.error.message }, { status: 500 });
  }
  if (subjectRes.error) {
    return Response.json({ error: subjectRes.error.message }, { status: 500 });
  }

  const studyRow = studyRes.data as
    | {
        id: string;
        study_name: string | null;
        protocol_number: string | null;
        company_id: string | null;
      }
    | null;
  const subjectRow = subjectRes.data as
    | {
        id: string;
        subject_number: string;
        status: string | null;
        study_id: string;
        study_sites: { site_number: string | null; name: string | null } | null;
      }
    | null;

  if (!studyRow) {
    return Response.json({ error: 'Study not found.' }, { status: 404 });
  }
  if (!subjectRow || subjectRow.study_id !== studyId) {
    return Response.json(
      { error: 'Subject not found in this study.' },
      { status: 404 },
    );
  }

  let companyName: string | null = null;
  let companyLogoUrl: string | null = null;
  if (studyRow.company_id) {
    const { data: companyRow } = await supabase
      .from('companies')
      .select('name, logo_url')
      .eq('id', studyRow.company_id)
      .maybeSingle();
    const c = companyRow as { name: string | null; logo_url: string | null } | null;
    companyName = c?.name ?? null;
    companyLogoUrl = c?.logo_url ?? null;
  }

  const logo = await resolveEcrfPdfLogo(companyLogoUrl);

  const visits = await getSubjectEcrfTracking(subjectId);

  const siteLabel = subjectRow.study_sites
    ? [subjectRow.study_sites.site_number, subjectRow.study_sites.name]
        .filter((p): p is string => Boolean(p && p.trim().length > 0))
        .join(' — ') || null
    : null;

  const buf = await renderSubjectEcrfPdf({
    study: {
      id: studyRow.id,
      name: studyRow.study_name ?? 'Study',
      protocol_id: studyRow.protocol_number ?? null,
    },
    subject: {
      id: subjectRow.id,
      subject_number: subjectRow.subject_number,
      site_label: siteLabel,
      status: subjectRow.status ?? null,
    },
    company: { name: companyName },
    logo,
    visits,
    generatedAt: new Date(),
    generatedBy: user?.email ?? null,
  });

  const filename = subjectEcrfPdfFilename(subjectRow.subject_number);

  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
