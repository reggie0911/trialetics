import { Section, Text } from '@react-email/components';
import { emailColors } from './layout';

export interface ReportMetaProps {
  studyLabel: string;
  siteLabel: string;
  visitTypeLabel: string;
  visitDate: string | null;
  authorName?: string | null;
}

const metaRow = {
  color: emailColors.textPrimary,
  fontSize: '13px',
  lineHeight: '20px',
  margin: 0,
};

const metaLabel = {
  color: emailColors.textMuted,
  fontWeight: 600 as const,
};

/**
 * Compact study + site + visit summary used inside every trip-report template
 * so the recipient always knows which report the email is about without
 * having to click through.
 */
export function ReportMeta({
  studyLabel,
  siteLabel,
  visitTypeLabel,
  visitDate,
  authorName,
}: ReportMetaProps) {
  return (
    <Section
      style={{
        backgroundColor: '#f9fafb',
        border: `1px solid ${emailColors.border}`,
        borderRadius: '6px',
        margin: '0 0 20px',
        padding: '12px 14px',
      }}
    >
      <Text style={metaRow}>
        <span style={metaLabel}>Study: </span>
        {studyLabel}
      </Text>
      <Text style={metaRow}>
        <span style={metaLabel}>Site: </span>
        {siteLabel}
      </Text>
      <Text style={metaRow}>
        <span style={metaLabel}>Visit: </span>
        {visitTypeLabel}
        {visitDate ? ` on ${visitDate}` : ''}
      </Text>
      {authorName ? (
        <Text style={metaRow}>
          <span style={metaLabel}>Author: </span>
          {authorName}
        </Text>
      ) : null}
    </Section>
  );
}
