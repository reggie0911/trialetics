import Link from 'next/link';
import { getEisfCategories, listEisfRules } from '@/lib/actions/eisf';
import { getEtmfStudies } from '@/lib/actions/etmf';
import { getStudySites } from '@/lib/actions/sites';
import { EisfRulesClient } from '@/components/eisf/eisf-rules-client';
import { Button } from '@/components/ui/button';

export default async function EisfRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ study?: string }>;
}) {
  const sp = await searchParams;
  const studiesRes = await getEtmfStudies();
  const studies = studiesRes.data ?? [];
  const studyId = sp.study && studies.some((s) => s.id === sp.study) ? sp.study : studies[0]?.id ?? null;

  const [rulesRes, catRes, sites] = await Promise.all([
    studyId ? listEisfRules(studyId) : Promise.resolve({ success: true as const, data: [] }),
    getEisfCategories(),
    studyId ? getStudySites(studyId) : Promise.resolve([]),
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
          <Link href="/protected/eisf">Overview</Link>
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
