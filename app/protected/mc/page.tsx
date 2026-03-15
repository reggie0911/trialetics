import { MCPageClient } from '@/components/mc/mc-page-client';
import { requireTrackerAccess } from '@/lib/actions/tracker-access';

export default async function MCPage() {
  const profile = await requireTrackerAccess();

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
          Med Compliance
        </h1>
        <p className="text-[11px] text-muted-foreground">
          Upload and manage medication compliance data
        </p>
      </div>

      <MCPageClient companyId={profile.company_id || ""} profileId={profile.id} isAdmin={profile.role === "admin"} />
    </div>
  );
}
