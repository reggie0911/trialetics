import Link from 'next/link';
import { ArrowLeft, Building2, ClipboardList, PlayCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStudies } from '@/lib/actions/studies';
import { SiteDemoStudyPicker } from '@/components/ctms/sites/site-demo-study-picker';

export default async function SiteCreationDemoPage() {
  const studies = await getStudies();

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" render={<Link href="/protected" />} nativeButton={false} className="-ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Dashboard
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Add site (demo)</h1>
        <p className="text-muted-foreground">
          Walk through adding an investigator site to one of your studies. Sample values are filled in so you can
          submit or edit the form like a real setup.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-[5px]">
          <CardHeader className="pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-1">
              <ClipboardList className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">1. Pick a study</CardTitle>
            <CardDescription>Choose the trial this site belongs to.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="rounded-[5px]">
          <CardHeader className="pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-1">
              <PlayCircle className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">2. Review the form</CardTitle>
            <CardDescription>Demo fields use a [DEMO] label you can change.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="rounded-[5px]">
          <CardHeader className="pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 mb-1">
              <Building2 className="h-4 w-4" />
            </div>
            <CardTitle className="text-base">3. Create the site</CardTitle>
            <CardDescription>You will land on the new site profile after save.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="rounded-[5px]">
        <CardHeader>
          <CardTitle>Start the demo</CardTitle>
          <CardDescription>
            You need at least one study with countries configured for the site form. If the list is empty, create a
            study first, then add countries under that study.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SiteDemoStudyPicker studies={studies} />
        </CardContent>
      </Card>
    </div>
  );
}
