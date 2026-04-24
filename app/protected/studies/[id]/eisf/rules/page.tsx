import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEisfCategories, listEisfRules } from '@/lib/actions/eisf';
import { getEtmfStudies } from '@/lib/actions/etmf';
import { getStudySites } from '@/lib/actions/sites';
import { EisfRulesClient } from '@/components/eisf/eisf-rules-client';
import { Button } from '@/components/ui/button';

interface StudyEisfRulesPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyEisfRulesPage({ params }: StudyEisfRulesPageProps) {
  const { id: studyId } = await params;
  const studiesRes = await getEtmfStudies();
  const studies = studiesRes.data ?? [];
  if (!studies.some((s) => s.id === studyId)) {
    notFound();
  }

  const [rulesRes, catRes, sites] = await Promise.all([
    listEisfRules(studyId),
    getEisfCategories(),
    getStudySites(studyId),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Required documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define rules per study (and optionally per site). Use &quot;Apply required-document rules&quot; on a folder to
            create missing placeholders.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="text-[12px]">
          <Link href={`/protected/studies/${studyId}/eisf`}>Overview</Link>
        </Button>
      </div>

      <EisfRulesClient
        studies={studies}
        initialStudyId={studyId}
        initialRules={rulesRes.data ?? []}
        categories={catRes.data ?? []}
        sites={sites}
      />
    </div>
  );
}
