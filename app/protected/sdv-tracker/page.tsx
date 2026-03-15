import { SDVTrackerPage } from '@/components/sdv-tracker/sdv-tracker-page';
import { requireTrackerAccess } from '@/lib/actions/tracker-access';
import { getSDVReports } from '@/lib/actions/sdv-tracker';

export default async function SDVTrackerPageRoute() {
  const profile = await requireTrackerAccess();

  const initialReports = await getSDVReports(profile.company_id || '');

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
          Source Data Verification Report
        </h1>
        <p className="text-[11px] text-muted-foreground">
          Monitor SDV completion rates across clinical trials with real-time percentage dashboards
        </p>
      </div>

      <SDVTrackerPage
        companyId={profile.company_id || ""}
        profileId={profile.id}
        initialReports={initialReports}
        isAdmin={profile.role === "admin"}
      />
    </div>
  );
}
