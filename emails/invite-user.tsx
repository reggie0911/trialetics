import { Link, Section, Text } from '@react-email/components';

import { CtaButton } from './_components/cta-button';
import { EmailLayout, emailColors } from './_components/layout';

export interface InviteUserProps {
  inviteeFirstName: string;
  inviterName: string;
  companyName: string;
  /** e.g. "AUR-204" or "TRI-DEMO-204"; null when no study assignment yet. */
  studyLabel: string | null;
  /** Human-readable study role label (TEAM_ROLE_LABEL[role]); null when no study. */
  roleLabel: string | null;
  acceptUrl: string;
}

const heading = {
  color: emailColors.textPrimary,
  fontSize: '20px',
  fontWeight: 600,
  lineHeight: '28px',
  margin: '0 0 12px',
};

const paragraph = {
  color: emailColors.textPrimary,
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 12px',
};

const muted = {
  color: emailColors.textMuted,
  fontSize: '12px',
  lineHeight: '18px',
  margin: '12px 0 0',
};

const infoCard = {
  backgroundColor: '#f9fafb',
  border: `1px solid ${emailColors.border}`,
  borderRadius: '6px',
  margin: '4px 0 4px',
  padding: '12px 14px',
};

const infoRow = {
  color: emailColors.textPrimary,
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 4px',
};

const infoLabel = {
  color: emailColors.textMuted,
  fontWeight: 600,
};

const fallbackLink = {
  color: emailColors.textMuted,
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};

export function InviteUser({
  inviteeFirstName,
  inviterName,
  companyName,
  studyLabel,
  roleLabel,
  acceptUrl,
}: InviteUserProps) {
  const greeting = inviteeFirstName.trim() || 'there';
  const subhead =
    studyLabel && roleLabel
      ? `${inviterName} added you to ${companyName} on study ${studyLabel} as ${roleLabel}.`
      : studyLabel
        ? `${inviterName} added you to ${companyName} on study ${studyLabel}.`
        : `${inviterName} added you to ${companyName} on Trialetics.`;

  return (
    <EmailLayout preview={`${inviterName} invited you to Trialetics`}>
      <Text style={heading}>You&apos;re invited to Trialetics</Text>
      <Text style={paragraph}>Hi {greeting},</Text>
      <Text style={paragraph}>{subhead}</Text>

      <Section style={infoCard}>
        <Text style={infoRow}>
          <span style={infoLabel}>Invited by: </span>
          {inviterName}
        </Text>
        <Text style={infoRow}>
          <span style={infoLabel}>Company: </span>
          {companyName}
        </Text>
        {studyLabel ? (
          <Text style={infoRow}>
            <span style={infoLabel}>Study: </span>
            {studyLabel}
          </Text>
        ) : null}
        {roleLabel ? (
          <Text style={{ ...infoRow, margin: 0 }}>
            <span style={infoLabel}>Role: </span>
            {roleLabel}
          </Text>
        ) : null}
      </Section>

      <Section style={{ margin: '24px 0 8px', textAlign: 'center' }}>
        <CtaButton href={acceptUrl}>Accept invitation</CtaButton>
      </Section>

      <Text style={muted}>
        If the button does not work, copy and paste this link into your
        browser:{' '}
        <Link href={acceptUrl} style={fallbackLink}>
          {acceptUrl}
        </Link>
      </Text>
      <Text style={muted}>
        This link expires after a short period. If it has expired, ask{' '}
        {inviterName} to resend the invite from the Team page.
      </Text>
    </EmailLayout>
  );
}

InviteUser.PreviewProps = {
  inviteeFirstName: 'Jordan',
  inviterName: 'Reggie Walton',
  companyName: 'Trialetics',
  studyLabel: 'TRI-DEMO-204',
  roleLabel: 'Clinical Project Manager',
  acceptUrl:
    'https://app.trialetics.io/auth/confirm?token_hash=preview&type=invite',
} satisfies InviteUserProps;

export default InviteUser;
