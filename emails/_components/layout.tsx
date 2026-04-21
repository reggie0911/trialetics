import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';

import { trialeticsLogoDataUri } from './logo-data';

const colors = {
  background: '#f6f8fb',
  surface: '#ffffff',
  border: '#e5e7eb',
  textPrimary: '#0f172a',
  textMuted: '#6b7280',
  brand: '#0f172a',
};

const fonts = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

// Marketing site the header logo links to. The logo image itself is inlined
// as a data: URI from logo-data.ts so we never depend on a hosted asset URL.
const marketingUrl = 'https://trialetics.io';

export interface EmailLayoutProps {
  preview: string;
  children: ReactNode;
}

/**
 * Shared shell for every Trialetics transactional email. Renders a centered
 * card with a brand header band and a small footer. Keep widths under 600px
 * so the card fits in the typical email client preview pane.
 */
export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: colors.background,
          fontFamily: fonts,
          margin: 0,
          padding: '24px 0',
        }}
      >
        <Container
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            margin: '0 auto',
            maxWidth: '560px',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          <Section
            style={{
              backgroundColor: '#ffffff',
              borderBottom: `1px solid ${colors.border}`,
              padding: '20px 24px',
            }}
          >
            <Link href={marketingUrl} style={{ textDecoration: 'none' }}>
              <Img
                src={trialeticsLogoDataUri}
                alt="Trialetics"
                width="144"
                height="36"
                style={{ display: 'block', border: 0, outline: 'none' }}
              />
            </Link>
          </Section>

          <Section style={{ padding: '24px' }}>{children}</Section>

          <Hr style={{ borderColor: colors.border, margin: 0 }} />

          <Section style={{ padding: '16px 24px' }}>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: '12px',
                lineHeight: '18px',
                margin: 0,
              }}
            >
              This is an automated message from Trialetics. If you were not
              expecting this email, you can safely ignore it.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const emailColors = colors;
export const emailFonts = fonts;
