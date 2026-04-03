/**
 * Structured server-side logging for finance flows (no PII in messages).
 * Use invoice / study ids only; amounts optional for support.
 */
export type FinanceLogEvent =
  | 'finance.invoice.create'
  | 'finance.invoice.submit'
  | 'finance.invoice.resubmit'
  | 'finance.invoice.decision.rpc'
  | 'finance.invoice.transaction_log'
  | 'finance.payment.create'
  | 'finance.payment.allocate';

export function logFinanceEvent(
  event: FinanceLogEvent,
  fields: Record<string, string | number | boolean | null | undefined>
): void {
  const payload = { event, ts: new Date().toISOString(), ...fields };
  console.log(JSON.stringify(payload));
}
