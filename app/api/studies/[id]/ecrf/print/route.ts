import { NextRequest } from 'next/server';

import { pdfFilenameFor } from '@/lib/exporters/ecrf-template';
import { renderEcrfPdf } from '@/lib/exporters/ecrf-pdf';
import { createClient } from '@/lib/server';
import { resolveEcrfPdfLogo } from '@/lib/server/ecrf-pdf-logo';
import {
  ECRF_ADMIN_ONLY_MESSAGE,
  assertEcrfAdminForStudy,
} from '@/lib/server/require-ecrf-admin';
import type {
  EcrfTemplateVersion,
  StudyCrf,
  StudyCrfQuestion,
  StudyVisitDefinition,
} from '@/lib/types/ctms';

export const runtime = 'nodejs';

/**
 * GET /api/studies/[id]/ecrf/print?versionId=...
 *
 * Returns a human-readable PDF of the requested eCRF template version. The
 * response uses inline disposition so the browser previews the PDF in a new
 * tab; users print or save it from the viewer.
 *
 * Admin-only (mirrors the CSV template route).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studyId } = await params;
  const supabase = await createClient();

  const { error: adminError } = await assertEcrfAdminForStudy(supabase, studyId);
  if (adminError) {
    const status = adminError === ECRF_ADMIN_ONLY_MESSAGE ? 403 : 401;
    return Response.json({ error: adminError }, { status });
  }

  const versionId = request.nextUrl.searchParams.get('versionId');
  if (!versionId) {
    return Response.json({ error: 'versionId query parameter is required.' }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [studyRes, versionRes] = await Promise.all([
    supabase
      .from('studies')
      .select('id, study_name, protocol_number, company_id')
      .eq('id', studyId)
      .maybeSingle(),
    supabase
      .from('study_ecrf_template_versions')
      .select('*')
      .eq('id', versionId)
      .maybeSingle(),
  ]);

  if (studyRes.error) {
    return Response.json({ error: studyRes.error.message }, { status: 500 });
  }
  if (versionRes.error) {
    return Response.json({ error: versionRes.error.message }, { status: 500 });
  }

  const studyRow = studyRes.data as
    | {
        id: string;
        study_name: string | null;
        protocol_number: string | null;
        company_id: string | null;
      }
    | null;
  const versionRow = versionRes.data as unknown as EcrfTemplateVersion | null;

  if (!studyRow) {
    return Response.json({ error: 'Study not found.' }, { status: 404 });
  }
  if (!versionRow || versionRow.study_id !== studyId) {
    return Response.json({ error: 'Version not found in this study.' }, { status: 404 });
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

  const [visitsRes, crfsRes, questionsRes] = await Promise.all([
    supabase
      .from('study_visit_definitions')
      .select('*')
      .eq('study_id', studyId)
      .eq('template_version_id', versionRow.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('study_crfs')
      .select('*')
      .eq('study_id', studyId)
      .eq('template_version_id', versionRow.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('study_crf_questions')
      .select('*')
      .eq('template_version_id', versionRow.id)
      .order('sort_order', { ascending: true }),
  ]);

  if (visitsRes.error || crfsRes.error || questionsRes.error) {
    return Response.json(
      {
        error:
          visitsRes.error?.message ??
          crfsRes.error?.message ??
          questionsRes.error?.message ??
          'Failed to load eCRF data.',
      },
      { status: 500 }
    );
  }

  const studyName = studyRow.study_name ?? 'Study';
  const protocolId = studyRow.protocol_number ?? null;

  const buf = await renderEcrfPdf({
    study: { id: studyRow.id, name: studyName, protocol_id: protocolId },
    company: { name: companyName },
    logo,
    version: versionRow,
    visits: (visitsRes.data ?? []) as unknown as StudyVisitDefinition[],
    crfs: (crfsRes.data ?? []) as unknown as StudyCrf[],
    questions: (questionsRes.data ?? []) as unknown as StudyCrfQuestion[],
    generatedAt: new Date(),
    generatedBy: user?.email ?? null,
  });

  const filenameLabel = protocolId ?? studyName;
  const filename = pdfFilenameFor(filenameLabel, versionRow.name);

  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
