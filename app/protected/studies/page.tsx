import { getStudies } from '@/lib/actions/studies';
import { listInstitutions } from '@/lib/actions/directory-institutions';
import { StudyList } from '@/components/ctms/studies/study-list';

export default async function StudiesPage() {
  const studies = await getStudies();
  const { data: institutions } = await listInstitutions({ limit: 100 });
  const institutionOptions = (institutions ?? []).map((i) => ({ id: i.id, name: i.name }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Studies</h1>
        <p className="text-muted-foreground mt-1">
          Manage your clinical trials and study protocols.
        </p>
      </div>

      <StudyList studies={studies} institutionOptions={institutionOptions} />
    </div>
  );
}
