import { NextRequest } from 'next/server';

import {
  comparePdfFilenameFor,
  pdfFilenameFor,
} from '@/lib/exporters/ecrf-template';
import { renderEcrfComparePdf, renderEcrfPdf } from '@/lib/exporters/ecrf-pdf';
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

interface VersionRows {
  version: EcrfTemplateVersion;
  visits: StudyVisitDefinition[];
  crfs: StudyCrf[];
  questions: StudyCrfQuestion[];
}

async function loadVersionRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studyId: string,
  versionId: string
): Promise<{ data: VersionRows | null; error: string | null; status: number }> {
  const { data: versionRow, error: versionError } = await supabase
    .from('study_ecrf_template_versions')
    .select('*')
    .eq('id', versionId)
    .maybeSingle();
  if (versionError) return { data: null, error: versionError.message, status: 500 };
  const v = versionRow as unknown as EcrfTemplateVersion | null;
  if (!v || v.study_id !== studyId) {
    return { data: null, error: 'Version not found in this study.', status: 404 };
  }

  const [visitsRes, crfsRes, questionsRes] = await Promise.all([
    supabase
      .from('study_visit_definitions')
      .select('*')
      .eq('study_id', studyId)
      .eq('template_version_id', v.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('study_crfs')
      .select('*')
      .eq('study_id', studyId)
      .eq('template_version_id', v.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('study_crf_questions')
      .select('*')
      .eq('template_version_id', v.id)
      .order('sort_order', { ascending: true }),
  ]);

  const firstError =
    visitsRes.error?.message ??
    crfsRes.error?.message ??
    questionsRes.error?.message;
  if (firstError) return { data: null, error: firstError, status: 500 };

  return {
    data: {
      version: v,
      visits: (visitsRes.data ?? []) as unknown as StudyVisitDefinition[],
      crfs: (crfsRes.data ?? []) as unknown as StudyCrf[],
      questions: (questionsRes.data ?? []) as unknown as StudyCrfQuestion[],
    },
    error: null,
    status: 200,
  };
}

/**
 * GET /api/studies/[id]/ecrf/print?versionId=...
 *
 * Returns a human-readable PDF of the requested eCRF template version. The
 * response uses inline disposition so the browser previews the PDF in a new
 * tab; users print or save it from the viewer.
 *
 * When `compareVersionId` is also provided, the response is a side-by-side
 * compare PDF that renders both versions back-to-back with identical chrome.
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
  const compareVersionId = request.nextUrl.searchParams.get('compareVersionId');
  if (!versionId) {
    return Response.json({ error: 'versionId query parameter is required.' }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: studyRow, error: studyError } = await supabase
    .from('studies')
    .select('id, study_name, protocol_number, company_id')
    .eq('id', studyId)
    .maybeSingle();
  if (studyError) {
    return Response.json({ error: studyError.message }, { status: 500 });
  }
  const study = studyRow as
    | {
        id: string;
        study_name: string | null;
        protocol_number: string | null;
        company_id: string | null;
      }
    | null;
  if (!study) {
    return Response.json({ error: 'Study not found.' }, { status: 404 });
  }

  let companyName: string | null = null;
  let companyLogoUrl: string | null = null;
  if (study.company_id) {
    const { data: companyRow } = await supabase
      .from('companies')
      .select('name, logo_url')
      .eq('id', study.company_id)
      .maybeSingle();
    const c = companyRow as { name: string | null; logo_url: string | null } | null;
    companyName = c?.name ?? null;
    companyLogoUrl = c?.logo_url ?? null;
  }

  const logo = await resolveEcrfPdfLogo(companyLogoUrl);

  const studyName = study.study_name ?? 'Study';
  const protocolId = study.protocol_number ?? null;
  const filenameLabel = protocolId ?? studyName;
  const generatedAt = new Date();
  const generatedBy = user?.email ?? null;
  const studyMeta = { id: study.id, name: studyName, protocol_id: protocolId };

  if (compareVersionId) {
    const [leftRes, rightRes] = await Promise.all([
      loadVersionRows(supabase, studyId, versionId),
      loadVersionRows(supabase, studyId, compareVersionId),
    ]);
    if (leftRes.error || !leftRes.data) {
      return Response.json({ error: leftRes.error }, { status: leftRes.status });
    }
    if (rightRes.error || !rightRes.data) {
      return Response.json({ error: rightRes.error }, { status: rightRes.status });
    }

    const buf = await renderEcrfComparePdf({
      study: studyMeta,
      company: { name: companyName },
      logo,
      left: leftRes.data,
      right: rightRes.data,
      generatedAt,
      generatedBy,
    });

    const filename = comparePdfFilenameFor(
      filenameLabel,
      leftRes.data.version.name,
      rightRes.data.version.name
    );
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const versionRes = await loadVersionRows(supabase, studyId, versionId);
  if (versionRes.error || !versionRes.data) {
    return Response.json({ error: versionRes.error }, { status: versionRes.status });
  }

  const buf = await renderEcrfPdf({
    study: studyMeta,
    company: { name: companyName },
    logo,
    version: versionRes.data.version,
    visits: versionRes.data.visits,
    crfs: versionRes.data.crfs,
    questions: versionRes.data.questions,
    generatedAt,
    generatedBy,
  });

  const filename = pdfFilenameFor(filenameLabel, versionRes.data.version.name);
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
