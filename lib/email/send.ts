import 'server-only';

import { render } from '@react-email/render';
import type { ReactElement } from 'react';
import { Resend } from 'resend';

import { createAdminClient } from '@/lib/server-admin';

const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

export type EmailCategory =
  | 'invite'
  | 'invite-resend'
  | 'report-submitted'
  | 'report-returned'
  | 'report-approved'
  | 'reviewer-assigned';

export interface SendEmailInput {
  to: string | string[];
  bcc?: string[];
  /**
   * Explicit Reply-To. If omitted, sendEmail falls back to the per-category
   * default and finally to EMAIL_REPLY_TO_DEFAULT.
   */
  replyTo?: string;
  subject: string;
  template: ReactElement;
  category: EmailCategory;
  /**
   * Forwarded to Resend as Idempotency-Key. Same key within Resend's
   * deduplication window will return the original send instead of duplicating.
   */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  skipped?: boolean;
  resendId?: string;
  error?: string;
}

const DEFAULT_FROM = 'Trialetics <noreply@trialetics.io>';

function uniqueNonEmpty(addresses: string[]): string[] {
  return [...new Set(addresses.filter((a): a is string => Boolean(a && a.trim())))];
}

function resolveReplyTo(
  category: EmailCategory,
  explicit: string | undefined,
): string | undefined {
  if (explicit?.trim()) return explicit.trim();
  const fallback = process.env.EMAIL_REPLY_TO_DEFAULT?.trim();
  // Invite emails should not silently fall back to a generic mailbox if the
  // caller failed to supply the inviter's address; the caller path is
  // responsible for setting replyTo. Use the env fallback for trip reports
  // where a study mailbox may be missing.
  if (
    category === 'report-submitted' ||
    category === 'report-returned' ||
    category === 'report-approved' ||
    category === 'reviewer-assigned'
  ) {
    return fallback || undefined;
  }
  return fallback || undefined;
}

interface EmailLogRow {
  category: EmailCategory;
  to_addresses: string[];
  bcc_addresses: string[] | null;
  reply_to: string | null;
  subject: string;
  resend_message_id: string | null;
  idempotency_key: string | null;
  status: 'sent' | 'failed' | 'skipped';
  error: string | null;
}

async function logEmail(row: EmailLogRow): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from('email_log').insert({
      category: row.category,
      to_addresses: row.to_addresses,
      bcc_addresses: row.bcc_addresses,
      reply_to: row.reply_to,
      subject: row.subject,
      resend_message_id: row.resend_message_id,
      idempotency_key: row.idempotency_key,
      status: row.status,
      error: row.error,
    });
    if (error) {
      console.warn('[email] failed to insert email_log row:', error.message);
    }
  } catch (e) {
    console.warn(
      '[email] email_log insert threw:',
      e instanceof Error ? e.message : String(e),
    );
  }
}

/**
 * The single send point for transactional email. Renders a React Email
 * template to HTML + plain text, sends via Resend, and writes an audit row
 * to `email_log` for every attempt. No-ops when RESEND_API_KEY is not set.
 *
 * Do NOT import the `resend` package from anywhere else - the lint guard
 * blocks it. All callers go through this helper so we keep one sender
 * domain, one log, and one idempotency story.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const toList = uniqueNonEmpty(Array.isArray(input.to) ? input.to : [input.to]);
  const bccList = uniqueNonEmpty(input.bcc ?? []);
  const replyTo = resolveReplyTo(input.category, input.replyTo);
  const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;

  if (toList.length === 0) {
    await logEmail({
      category: input.category,
      to_addresses: [],
      bcc_addresses: bccList.length ? bccList : null,
      reply_to: replyTo ?? null,
      subject: input.subject,
      resend_message_id: null,
      idempotency_key: input.idempotencyKey ?? null,
      status: 'skipped',
      error: 'no recipients',
    });
    return { skipped: true };
  }

  if (!resend) {
    await logEmail({
      category: input.category,
      to_addresses: toList,
      bcc_addresses: bccList.length ? bccList : null,
      reply_to: replyTo ?? null,
      subject: input.subject,
      resend_message_id: null,
      idempotency_key: input.idempotencyKey ?? null,
      status: 'skipped',
      error: 'RESEND_API_KEY not configured',
    });
    return { skipped: true };
  }

  let html: string;
  let text: string;
  try {
    html = await render(input.template);
    text = await render(input.template, { plainText: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[email] render failed:', message);
    await logEmail({
      category: input.category,
      to_addresses: toList,
      bcc_addresses: bccList.length ? bccList : null,
      reply_to: replyTo ?? null,
      subject: input.subject,
      resend_message_id: null,
      idempotency_key: input.idempotencyKey ?? null,
      status: 'failed',
      error: `render: ${message}`,
    });
    return { error: message };
  }

  try {
    const response = await resend.emails.send(
      {
        from: fromEmail,
        to: toList,
        bcc: bccList.length ? bccList : undefined,
        replyTo: replyTo,
        subject: input.subject,
        html,
        text,
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
    );

    if (response.error) {
      const message = response.error.message ?? 'unknown Resend error';
      console.error('[email] resend error:', message);
      await logEmail({
        category: input.category,
        to_addresses: toList,
        bcc_addresses: bccList.length ? bccList : null,
        reply_to: replyTo ?? null,
        subject: input.subject,
        resend_message_id: null,
        idempotency_key: input.idempotencyKey ?? null,
        status: 'failed',
        error: message,
      });
      return { error: message };
    }

    const resendId = response.data?.id ?? null;
    await logEmail({
      category: input.category,
      to_addresses: toList,
      bcc_addresses: bccList.length ? bccList : null,
      reply_to: replyTo ?? null,
      subject: input.subject,
      resend_message_id: resendId,
      idempotency_key: input.idempotencyKey ?? null,
      status: 'sent',
      error: null,
    });
    return { resendId: resendId ?? undefined };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[email] resend threw:', message);
    await logEmail({
      category: input.category,
      to_addresses: toList,
      bcc_addresses: bccList.length ? bccList : null,
      reply_to: replyTo ?? null,
      subject: input.subject,
      resend_message_id: null,
      idempotency_key: input.idempotencyKey ?? null,
      status: 'failed',
      error: message,
    });
    return { error: message };
  }
}
