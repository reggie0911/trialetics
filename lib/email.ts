import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getInviteEmailHtml(firstName: string, lastName: string, inviteLink: string): string {
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'there';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <p style="font-size:16px;line-height:1.6;color:#374151;">Hi ${escapeHtml(displayName)},</p>
  <p style="font-size:16px;line-height:1.6;color:#374151;">You&apos;ve been invited to join Trialetics to collaborate on clinical trial activities.</p>
  <p style="font-size:16px;line-height:1.6;color:#374151;">Click the button below to set up your account:</p>
  <p style="margin:24px 0;">
    <a href="${escapeHtml(inviteLink)}" style="display:inline-block;padding:12px 24px;background-color:#0f172a;color:#ffffff;text-decoration:none;border-radius:6px;font-size:16px;font-weight:600;">Accept Invitation</a>
  </p>
  <p style="font-size:14px;line-height:1.6;color:#6b7280;">Once logged in, you can access assigned studies and track progress.</p>
  <p style="font-size:16px;line-height:1.6;color:#374151;margin-top:24px;">Welcome to the team!</p>
  <p style="font-size:14px;color:#6b7280;margin-top:24px;">Kind regards,<br>Trialetics.io</p>
</body>
</html>`;
}
