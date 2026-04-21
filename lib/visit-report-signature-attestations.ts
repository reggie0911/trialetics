/**
 * Canonical Part 11 attestation strings for trip report signatures.
 *
 * Lives in its own module (no node imports, no `'use server'`) so both
 * server actions in `lib/visit-report-signature.ts` AND the
 * client-side `signature-capture-modal.tsx` can import the same byte
 * sequence. The server rejects any submit/approve request whose
 * `attestationText` does not match these constants exactly, so the
 * "meaning of signature" (21 CFR 11.50(a)(2)) is fixed at the server
 * and unambiguously rendered to the signer at sign time.
 *
 * @see lib/visit-report-signature.ts
 * @see components/ctms/trip-reports/signature-capture-modal.tsx
 * @see docs/PART11_CONTROLS.md
 */

export const TRIP_REPORT_AUTHOR_ATTESTATION =
  'I attest that I have completed this visit report to the best of my knowledge, ' +
  'that the responses, narrative, attendees, and supporting evidence reflect the ' +
  'monitoring visit as conducted, and that I am submitting it for review. I ' +
  'understand that this electronic signature is the legally binding equivalent ' +
  'of my handwritten signature.';

export const TRIP_REPORT_APPROVER_ATTESTATION =
  'I attest that I have reviewed this visit report for accuracy, completeness, ' +
  'and appropriate documentation of findings and action items, and I approve it ' +
  'as final. I understand that this electronic signature is the legally binding ' +
  'equivalent of my handwritten signature.';

export const TRIP_REPORT_VOID_ATTESTATION =
  'I attest that I am voiding the prior approval of this visit report and that ' +
  'the reason recorded with this action is true and accurate. I understand that ' +
  'this electronic signature, including the void reason, is the legally binding ' +
  'equivalent of my handwritten signature and will be retained as part of the ' +
  'permanent audit record.';
