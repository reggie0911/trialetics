import { getAllVisits } from '@/lib/actions/visits';
import { getStudies } from '@/lib/actions/studies';
import { VisitList } from '@/components/ctms/visits/visit-list';

export default async function VisitsPage() {
  const [visits, studies] = await Promise.all([
    getAllVisits(),
    getStudies(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div data-onboarding="page-visits">
        <h1 className="text-2xl font-semibold tracking-tight">Monitoring Visits</h1>
        <p className="text-sm text-muted-foreground">
          View and track monitoring visits across all studies.
        </p>
      </div>
      <VisitList
        visits={visits}
        studies={studies.map((s) => ({ id: s.id, title: s.title }))}
      />
    </div>
  );
}
