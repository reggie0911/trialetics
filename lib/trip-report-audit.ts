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

export type TripReportSignatureAuditKind =
  | 'author_submit'
  | 'approver_approve'
  | 'void_approval';

/**
 * Append a row to `trip_report_signature_audit`. This is the canonical
 * record of an electronic signature manifestation for a trip report
 * (21 CFR 11.50): printed name, full attestation paragraph, server-set
 * timestamp, and (where applicable) the SHA-256 content hash that
 * binds the signature to the record.
 *
 * Writes go through the service role so the per-table RLS (no INSERT
 * policy for authenticated) cannot be widened by accident; the
 * BEFORE UPDATE/DELETE trigger installed by the 20260602 migration
 * blocks every role (including service role) from rewriting an
 * existing audit row.
 *
 * Returns `{ id }` on success or `{ error }` on failure. Unlike
 * `logTripReportStatusEvent` we surface the error so callers can fail
 * the signing action atomically when the audit row cannot be written.
 */
export async function logTripReportSignatureAudit(input: {
  tripReportId: string;
  kind: TripReportSignatureAuditKind;
  actorProfileId: string;
  printedName: string;
  attestationText: string;
  contentHash?: string | null;
  passwordVerified: boolean;
  reason?: string | null;
  signedAtDb?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  /**
   * Optional UUID shared by every audit row written during a single
   * continuous bulk-signing session (per 21 CFR 11.200(a)(1)(ii)).
   * Single-report signatures leave this `null`; only `approveReportsBulk`
   * populates it, so a regulator can re-tie the per-report signatures
   * back to the one credential challenge that authorized them.
   */
  signingSessionId?: string | null;
}): Promise<{ id: string | null; error: string | null }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('trip_report_signature_audit')
      .insert({
        trip_report_id: input.tripReportId,
        kind: input.kind,
        actor_profile_id: input.actorProfileId,
        printed_name: input.printedName,
        attestation_text: input.attestationText,
        content_hash: input.contentHash ?? null,
        password_verified: input.passwordVerified,
        reason: input.reason ?? null,
        signed_at_db: input.signedAtDb ?? new Date().toISOString(),
        ip_address: input.ipAddress ?? null,
        user_agent: input.userAgent ?? null,
        signing_session_id: input.signingSessionId ?? null,
      })
      .select('id')
      .single();
    if (error) return { id: null, error: error.message };
    const id = (data as { id?: string } | null)?.id ?? null;
    return { id, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'logTripReportSignatureAudit failed';
    console.error('logTripReportSignatureAudit failed:', e);
    return { id: null, error: msg };
  }
}
