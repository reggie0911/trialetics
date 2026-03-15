import { ECRFQueryTrackerPageClient } from '@/components/ecrf-query-tracker/ecrf-query-tracker-page-client';
import { requireTrackerAccess } from '@/lib/actions/tracker-access';

export default async function ECRFQueryTrackerPage() {
  const profile = await requireTrackerAccess();

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
          eCRF Query Tracker
        </h1>
        <p className="text-[11px] text-muted-foreground">
          Track and monitor eCRF query volume, status, aging, and resolution trends
        </p>
      </div>

      <ECRFQueryTrackerPageClient
        companyId={profile.company_id || ""}
        profileId={profile.id}
        isAdmin={profile.role === "admin"}
      />
    </div>
  );
}
