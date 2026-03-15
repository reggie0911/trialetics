import { PatientsPageClient } from '@/components/patients/patients-page-client';
import { requireTrackerAccess } from '@/lib/actions/tracker-access';

export default async function PatientsPage() {
  const profile = await requireTrackerAccess();

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">
          MRace Performance Tracker
        </h1>
        <p className="text-xs text-muted-foreground">
          Upload and manage patient data for your company
        </p>
      </div>

      <PatientsPageClient
        companyId={profile.company_id || ""}
        profileId={profile.id}
        isAdmin={profile.role === "admin"}
      />
    </div>
  );
}
