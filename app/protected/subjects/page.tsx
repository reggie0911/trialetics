import { getAllSubjects } from '@/lib/actions/subjects';
import { SubjectList } from '@/components/ctms/subjects/subject-list';

export default async function SubjectsPage() {
  const subjects = await getAllSubjects();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Subjects</h1>
        <p className="text-muted-foreground">
          All enrolled subjects across your studies.
        </p>
      </div>
      <SubjectList subjects={subjects} />
    </div>
  );
}
