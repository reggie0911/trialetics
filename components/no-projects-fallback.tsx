'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CreateProjectForm } from '@/components/create-project-form';

export function NoProjectsFallback() {
  const router = useRouter();

  const handleProjectCreated = () => {
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>No projects assigned</CardTitle>
          <CardDescription>
            Create your first project to get started. Once created, you will be
            redirected to the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateProjectForm onSuccess={handleProjectCreated} />
        </CardContent>
      </Card>
    </div>
  );
}
