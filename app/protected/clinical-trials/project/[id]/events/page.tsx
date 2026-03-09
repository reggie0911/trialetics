import { ProjectEventsPage } from '@/components/clinical-trials/project-events-page';

interface EventsPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventsPage({ params }: EventsPageProps) {
  const { id } = await params;
  return <ProjectEventsPage projectId={id} />;
}
