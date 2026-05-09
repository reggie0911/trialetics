import { consumePageDynamic } from '@/lib/next/consume-page-dynamic';

export default async function ModuleUnavailablePage(props: {
  params?: Promise<unknown>;
  searchParams?: Promise<unknown>;
}) {
  await consumePageDynamic(props);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">No modules enabled</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your organization does not have access to any Trialetics modules (CTMS, study trackers, or eTMF).
          If you believe this is a mistake, contact your Trialetics administrator or support.
        </p>
      </div>
    </div>
  );
}
