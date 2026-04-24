import { notFound, redirect } from 'next/navigation';

import { getTemplateById } from '@/lib/actions/visit-reports';

/**
 * Legacy URL: canonical template builder is under
 * `/protected/studies/[studyId]/trip-reports/templates/[templateId]`.
 */
export default async function TemplateBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const { mode } = await searchParams;
  const template = await getTemplateById(id);
  if (!template) notFound();
  const studyId = template.study_id;
  if (!studyId) {
  redirect('/protected/studies#studies');
  }
  const suffix = mode === 'view' ? '?mode=view' : '';
  redirect(`/protected/studies/${studyId}/trip-reports/templates/${id}${suffix}`);
}
