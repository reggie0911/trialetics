'use client';

import { CTMSPageHeader } from './ctms-layout';
import { ActivityCalendarClient } from './activity-calendar-client';

interface ActivityCalendarPageProps {
  companyId: string;
}

export function ActivityCalendarPage({ companyId }: ActivityCalendarPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <CTMSPageHeader
        title="Project Activity Calendar"
        subtitle="View project activities and milestones by month"
      />
      <ActivityCalendarClient companyId={companyId} />
    </div>
  );
}
