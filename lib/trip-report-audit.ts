import { createAdminClient } from '@/lib/server-admin';

export async function logTripReportStatusEvent(input: {
  tripReportId: string;
  fromStatus: string | null;
  toStatus: string;
  actorProfileId: string;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('trip_report_status_events').insert({
      trip_report_id: input.tripReportId,
      from_status: input.fromStatus,
      to_status: input.toStatus,
      actor_profile_id: input.actorProfileId,
      metadata: input.metadata ?? null,
    });
  } catch (e) {
    console.error('logTripReportStatusEvent failed:', e);
  }
}
