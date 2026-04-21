import { NextRequest } from 'next/server';

import {
  buildEmptyTemplateCsv,
  buildPopulatedTemplateCsv,
  templateFilenameFor,
} from '@/lib/exporters/ecrf-template';
import { createClient } from '@/lib/server';
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
 * GET /api/studies/[id]/ecrf/template
 *
 * Returns a CSV template suitable for the eCRF Builder bulk uploader.
 *
 * Query params:
 *   - versionId  Optional. When provided, the CSV is pre-populated with the
 *                visits / CRFs / questions of that template version. When
 *                omitted, the response is the blank template (header rows +
 *                three example rows).
 *   - empty=1    Forces the blank template even if a version is selected.
 *
 * Admin-only. Returns 403 for non-admins; never leaks template contents.
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

  const { data: study } = await supabase
    .from('studies')
    .select('id, study_name, protocol_number')
    .eq('id', studyId)
    .maybeSingle();
  const studyLabel =
    (study?.protocol_number as string | null) ??
    (study?.study_name as string | null) ??
    'study';

  const versionIdParam = request.nextUrl.searchParams.get('versionId');
  const forceEmpty = request.nextUrl.searchParams.get('empty') === '1';

  let csv: string;
  let versionLabel: string | null = null;

  if (versionIdParam && !forceEmpty) {
    const { data: version, error: versionError } = await supabase
      .from('study_ecrf_template_versions')
      .select('*')
      .eq('id', versionIdParam)
      .maybeSingle();
    if (versionError) {
      return Response.json({ error: versionError.message }, { status: 500 });
    }
    if (!version || (version as { study_id: string }).study_id !== studyId) {
      return Response.json({ error: 'Version not found in this study.' }, { status: 404 });
    }
    const v = version as unknown as EcrfTemplateVersion;
    versionLabel = v.name;

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

    csv = buildPopulatedTemplateCsv({
      visits: (visitsRes.data ?? []) as unknown as StudyVisitDefinition[],
      crfs: (crfsRes.data ?? []) as unknown as StudyCrf[],
      questions: (questionsRes.data ?? []) as unknown as StudyCrfQuestion[],
    });
  } else {
    csv = buildEmptyTemplateCsv();
  }

  const filename = templateFilenameFor(studyLabel, versionLabel);
  const body = '\ufeff' + csv; // BOM so Excel auto-detects UTF-8

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
