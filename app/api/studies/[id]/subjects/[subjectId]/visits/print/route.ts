import { NextRequest } from 'next/server';

import { subjectVisitsPdfFilename } from '@/lib/exporters/subject-visits-csv';
import { renderSubjectVisitsPdf } from '@/lib/exporters/subject-visits-pdf';
import { createClient } from '@/lib/server';
import { resolveEcrfPdfLogo } from '@/lib/server/ecrf-pdf-logo';
import type { SubjectVisit, VisitAnchorKind } from '@/lib/types/ctms';

export const runtime = 'nodejs';

/**
 * GET /api/studies/[id]/subjects/[subjectId]/visits/print
 *
 * Returns the subject's visit schedule as a human-readable PDF (inline so the
 * browser previews it). Read-only - write-lock does NOT block export.
 * Authorization piggybacks on RLS for the underlying data plus a study-scope
 * check on the subject row.
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
      .select(
        'id, subject_number, status, study_id, screening_date, randomization_date, visit_anchor_kind, study_sites(site_number, name)',
      )
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
        screening_date: string | null;
        randomization_date: string | null;
        visit_anchor_kind: VisitAnchorKind;
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

  const { data: visits, error: visitsError } = await supabase
    .from('subject_visits')
    .select('*')
    .eq('subject_id', subjectId)
    .order('sort_order', { ascending: true })
    .order('visit_number', { ascending: true });

  if (visitsError) {
    return Response.json({ error: visitsError.message }, { status: 500 });
  }

  const siteLabel = subjectRow.study_sites
    ? [subjectRow.study_sites.site_number, subjectRow.study_sites.name]
        .filter((p): p is string => Boolean(p && p.trim().length > 0))
        .join(' — ') || null
    : null;

  const anchorDate =
    subjectRow.visit_anchor_kind === 'screening'
      ? subjectRow.screening_date
      : subjectRow.randomization_date;

  const buf = await renderSubjectVisitsPdf({
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
    visits: (visits ?? []) as unknown as SubjectVisit[],
    anchorKind: subjectRow.visit_anchor_kind,
    anchorDate,
    generatedAt: new Date(),
    generatedBy: user?.email ?? null,
  });

  const filename = subjectVisitsPdfFilename(subjectRow.subject_number);

  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
