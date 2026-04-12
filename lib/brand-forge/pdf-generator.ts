import React from 'react';
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { BFBrandKit, BFColorSwatch, BFBrandDirection } from '@/lib/types/brand-forge';
import { FONT_PAIRINGS } from '@/lib/brand-forge/font-pairings';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  coverPage: { padding: 40, justifyContent: 'center', alignItems: 'center', fontFamily: 'Helvetica' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666666', marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 24, borderBottomWidth: 1, borderBottomColor: '#E5E5E5', paddingBottom: 6 },
  label: { fontSize: 8, color: '#999999', textTransform: 'uppercase', marginBottom: 2 },
  text: { fontSize: 10, lineHeight: 1.6, marginBottom: 8 },
  smallText: { fontSize: 8, color: '#666666' },
  row: { flexDirection: 'row', marginBottom: 8 },
  swatch: { width: 60, height: 60, marginRight: 12, borderRadius: 4 },
  swatchLabel: { fontSize: 8, marginTop: 4, textAlign: 'center' },
  swatchHex: { fontSize: 7, color: '#999999', textAlign: 'center' },
  card: { borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 4, padding: 12, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

interface BrandGuideData {
  studyName: string;
  protocolNumber?: string;
  sponsor?: string;
  therapeuticArea?: string;
  brandKit: BFBrandKit | null;
  brandDirection: BFBrandDirection | null;
}

export async function generateBrandGuidePdf(data: BrandGuideData): Promise<Buffer> {
  const { studyName, protocolNumber, sponsor, therapeuticArea, brandKit, brandDirection } = data;

  const fontPairing = brandKit?.font_pairing?.pairing_id
    ? FONT_PAIRINGS.find((fp) => fp.id === brandKit.font_pairing.pairing_id)
    : null;

  const palette: BFColorSwatch[] = brandKit?.color_palette ?? brandDirection?.color_palette ?? [];

  const doc = React.createElement(Document, null,
    // Cover page
    React.createElement(Page, { size: 'A4', style: styles.coverPage },
      React.createElement(Text, { style: styles.title }, studyName),
      protocolNumber ? React.createElement(Text, { style: styles.subtitle }, protocolNumber) : null,
      React.createElement(Text, { style: { fontSize: 12, color: '#999', marginTop: 20 } }, 'Brand Guide'),
      sponsor ? React.createElement(Text, { style: { fontSize: 10, color: '#999', marginTop: 8 } }, sponsor) : null,
      therapeuticArea ? React.createElement(Text, { style: { fontSize: 10, color: '#999', marginTop: 4 } }, therapeuticArea) : null,
    ),

    // Color palette page
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Color Palette'),
      React.createElement(View, { style: styles.grid },
        ...palette.map((swatch, i) =>
          React.createElement(View, { key: i, style: { alignItems: 'center', marginBottom: 16, width: 80 } },
            React.createElement(View, { style: { ...styles.swatch, backgroundColor: swatch.hex } }),
            React.createElement(Text, { style: styles.swatchLabel }, swatch.name),
            React.createElement(Text, { style: styles.swatchHex }, swatch.hex),
            React.createElement(Text, { style: styles.swatchHex }, swatch.usage),
          )
        ),
      ),
    ),

    // Typography page
    fontPairing ? React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Typography'),
      React.createElement(View, { style: styles.card },
        React.createElement(Text, { style: styles.label }, 'HEADING FONT'),
        React.createElement(Text, { style: { fontSize: 20, marginBottom: 12 } }, fontPairing.primary),
        React.createElement(Text, { style: styles.label }, 'BODY FONT'),
        React.createElement(Text, { style: { fontSize: 14, marginBottom: 12 } }, fontPairing.secondary),
        React.createElement(Text, { style: styles.label }, 'DESCRIPTION'),
        React.createElement(Text, { style: styles.text }, fontPairing.description),
      ),
      React.createElement(Text, { style: styles.sectionTitle }, 'Type Scale'),
      ...['H1 — 32pt', 'H2 — 24pt', 'H3 — 20pt', 'Body — 16pt', 'Small — 14pt', 'Caption — 12pt'].map((level) =>
        React.createElement(Text, { key: level, style: { fontSize: 10, marginBottom: 4 } }, level)
      ),
    ) : null,

    // Brand direction page
    brandDirection ? React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Brand Direction'),
      brandDirection.mood ? React.createElement(View, { style: styles.card },
        React.createElement(Text, { style: styles.label }, 'MOOD'),
        React.createElement(Text, { style: styles.text }, brandDirection.mood),
      ) : null,
      brandDirection.visual_direction ? React.createElement(View, { style: styles.card },
        React.createElement(Text, { style: styles.label }, 'VISUAL DIRECTION'),
        React.createElement(Text, { style: styles.text }, brandDirection.visual_direction),
      ) : null,
      brandDirection.icon_style ? React.createElement(View, { style: styles.card },
        React.createElement(Text, { style: styles.label }, 'ICON STYLE'),
        React.createElement(Text, { style: styles.text }, brandDirection.icon_style),
      ) : null,
      brandDirection.imagery_direction ? React.createElement(View, { style: styles.card },
        React.createElement(Text, { style: styles.label }, 'IMAGERY DIRECTION'),
        React.createElement(Text, { style: styles.text }, brandDirection.imagery_direction),
      ) : null,
    ) : null,

    // Tone guide page
    brandDirection?.tone_variants ? React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Tone Guide'),
      ...Object.entries(brandDirection.tone_variants).map(([audience, tone]) =>
        React.createElement(View, { key: audience, style: styles.card },
          React.createElement(Text, { style: styles.label }, audience.toUpperCase()),
          React.createElement(Text, { style: styles.text }, tone as string),
        )
      ),
      brandDirection.patient_communication_style ? React.createElement(View, { style: styles.card },
        React.createElement(Text, { style: styles.label }, 'PATIENT COMMUNICATION STYLE'),
        React.createElement(Text, { style: styles.text }, brandDirection.patient_communication_style),
      ) : null,
    ) : null,

    // Brand voice page
    brandKit?.brand_voice_summary ? React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.sectionTitle }, 'Brand Voice'),
      React.createElement(Text, { style: styles.text }, brandKit.brand_voice_summary),
      brandKit.usage_guidance ? React.createElement(View, null,
        React.createElement(Text, { style: styles.sectionTitle }, 'Usage Guidance'),
        React.createElement(Text, { style: styles.text }, brandKit.usage_guidance),
      ) : null,
    ) : null,
  );

  return await renderToBuffer(doc);
}
