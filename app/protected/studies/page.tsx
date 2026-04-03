import { getStudies } from '@/lib/actions/studies';
import { StudyList } from '@/components/ctms/studies/study-list';

export default async function StudiesPage() {
  const studies = await getStudies();

  return (
    <div className="p-6 space-y-6">
      <div data-onboarding="page-studies">
        <h1 className="text-2xl font-semibold tracking-tight">Studies</h1>
        <p className="text-muted-foreground mt-1">
          Manage your clinical trials and study protocols.
        </p>
      </div>

      <StudyList studies={studies} />
    </div>
  );
}
