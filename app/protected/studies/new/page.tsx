import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StudyForm } from '@/components/ctms/studies/study-form';

export default async function NewStudyPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" render={<Link href="/protected/studies" />} nativeButton={false} className="-ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Studies
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Create New Study</h1>
        <p className="text-muted-foreground">
          Set up a new clinical trial with protocol details.
        </p>
      </div>

      <StudyForm mode="create" />
    </div>
  );
}
