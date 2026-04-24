import { Link, Section, Text } from '@react-email/components';

import { CtaButton } from './_components/cta-button';
import { EmailLayout, emailColors } from './_components/layout';

export interface AddedToStudyProps {
  inviteeFirstName: string;
  inviterName: string;
  companyName: string;
  studyLabel: string;
  /** Human-readable study role label (TEAM_ROLE_LABEL[role]); null when not provided. */
  roleLabel: string | null;
  studyUrl: string;
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

export function AddedToStudy({
  inviteeFirstName,
  inviterName,
  companyName,
  studyLabel,
  roleLabel,
  studyUrl,
}: AddedToStudyProps) {
  const greeting = inviteeFirstName.trim() || 'there';
  const subhead = roleLabel
    ? `${inviterName} added you to ${studyLabel} as ${roleLabel}.`
    : `${inviterName} added you to ${studyLabel}.`;

  return (
    <EmailLayout preview={`You were added to ${studyLabel}`}>
      <Text style={heading}>You were added to a study</Text>
      <Text style={paragraph}>Hi {greeting},</Text>
      <Text style={paragraph}>{subhead}</Text>

      <Section style={infoCard}>
        <Text style={infoRow}>
          <span style={infoLabel}>Added by: </span>
          {inviterName}
        </Text>
        <Text style={infoRow}>
          <span style={infoLabel}>Company: </span>
          {companyName}
        </Text>
        <Text style={infoRow}>
          <span style={infoLabel}>Study: </span>
          {studyLabel}
        </Text>
        {roleLabel ? (
          <Text style={{ ...infoRow, margin: 0 }}>
            <span style={infoLabel}>Role: </span>
            {roleLabel}
          </Text>
        ) : null}
      </Section>

      <Section style={{ margin: '24px 0 8px', textAlign: 'center' }}>
        <CtaButton href={studyUrl}>Open study</CtaButton>
      </Section>

      <Text style={muted}>
        If the button does not work, copy and paste this link into your
        browser:{' '}
        <Link href={studyUrl} style={fallbackLink}>
          {studyUrl}
        </Link>
      </Text>
    </EmailLayout>
  );
}

AddedToStudy.PreviewProps = {
  inviteeFirstName: 'Jordan',
  inviterName: 'Reggie Walton',
  companyName: 'Trialetics',
  studyLabel: 'TRI-DEMO-204',
  roleLabel: 'Clinical Project Manager',
  studyUrl: 'https://app.trialetics.io/protected/studies/preview',
} satisfies AddedToStudyProps;

export default AddedToStudy;
