import { AEPageClient } from '@/components/ae/ae-page-client';
import { requireTrackerAccess } from '@/lib/actions/tracker-access';

export default async function AEPage() {
  const profile = await requireTrackerAccess();

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
          AE Metrics
        </h1>
        <p className="text-[11px] text-muted-foreground">
          Upload and manage adverse event data
        </p>
      </div>

      <AEPageClient
        companyId={profile.company_id || ""}
        profileId={profile.id}
        isAdmin={profile.role === "admin"}
      />
    </div>
  );
}
