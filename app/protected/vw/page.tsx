import { VWPageClient } from '@/components/vw/vw-page-client';
import { requireTrackerAccess } from '@/lib/actions/tracker-access';

export default async function VWPage() {
  const profile = await requireTrackerAccess();

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
          Visit Window
        </h1>
        <p className="text-[11px] text-muted-foreground">
          Track subject visit windows and monitor compliance alerts
        </p>
      </div>

      <VWPageClient companyId={profile.company_id || ""} profileId={profile.id} isAdmin={profile.role === "admin"} />
    </div>
  );
}
