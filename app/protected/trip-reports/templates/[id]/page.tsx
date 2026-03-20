import { notFound } from 'next/navigation';
import { getTemplateById, getTemplateQuestions } from '@/lib/actions/visit-reports';
import { getStudies } from '@/lib/actions/studies';
import { TemplateBuilderClient } from '@/components/ctms/trip-reports/template-builder-client';

export default async function TemplateBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const readOnly = resolvedSearchParams?.mode === 'view';
  const [template, questions, studies] = await Promise.all([
    getTemplateById(id),
    getTemplateQuestions(id),
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
      />
    </div>
  );
}
