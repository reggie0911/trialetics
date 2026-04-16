import { notFound } from 'next/navigation';
import { getTemplateById, getTemplateQuestions } from '@/lib/actions/visit-reports';
import { getStudies } from '@/lib/actions/studies';
import { getStudyByIdCached } from '@/lib/actions/studies';
import { TemplateBuilderClient } from '@/components/ctms/trip-reports/template-builder-client';

export default async function StudyTemplateBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; templateId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id: studyId, templateId } = await params;
  const resolvedSearchParams = await searchParams;
  const readOnly = resolvedSearchParams?.mode === 'view';

  const study = await getStudyByIdCached(studyId);
  if (!study) notFound();

  const [template, questions, studies] = await Promise.all([
    getTemplateById(templateId),
    getTemplateQuestions(templateId),
    getStudies(),
  ]);
  if (!template) notFound();

  return (
    <div className="p-6">
      <TemplateBuilderClient
        template={template}
        initialQuestions={questions}
        studies={studies.map((s) => ({
          id: s.id,
          title: s.title,
          protocol_number: s.protocol_number,
          description: s.description,
          therapeutic_area: s.therapeutic_area,
          indication: s.indication,
        }))}
        readOnly={readOnly}
        tripReportsBasePath={`/protected/studies/${studyId}/trip-reports`}
      />
    </div>
  );
}
