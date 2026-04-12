import type { BFBrandInputs } from '@/lib/types/brand-forge';

const STYLE_MAP: Record<string, string> = {
  'minimal-wordmark': 'minimalist wordmark logo, clean typography, negative space, simple and elegant',
  'icon-text': 'logo with an abstract icon symbol paired with the study name text, modern combination mark',
  'lettermark': 'lettermark logo using stylized initials, monogram design, typographic',
  'abstract-symbol': 'abstract geometric logo symbol, clean vector shapes, iconic',
  'emblem-badge': 'emblem style logo, study name enclosed in a badge or crest shape, contained logo',
};

const THERAPEUTIC_VISUAL_MAP: Record<string, string> = {
  'Oncology': 'empathetic, hopeful, supportive, warm tones with clinical credibility',
  'Cardiology': 'clean, clinical, modern, trust-focused, cardiovascular-inspired motifs',
  'Rare Disease': 'community-centered, compassionate, inclusive, warm earth tones',
  'Neurology': 'innovative, precise, neural-inspired patterns, calming blues and teals',
  'Immunology': 'modern, scientific, resilient, cellular-inspired motifs',
  'Infectious Disease': 'urgent, clear, globally-aware, clean and clinical',
  'Endocrinology': 'balanced, supportive, molecular motifs',
  'Dermatology': 'clean, confidence-building, skin-tone-aware palette',
  'Ophthalmology': 'clear, precise, vision-focused, eye-inspired elements',
  'Psychiatry': 'gentle, non-stigmatizing, supportive, calming colors',
  'Respiratory': 'clean, breath-inspired, open and airy design',
  'Gastroenterology': 'professional, digestive-aware, balanced clinical tone',
  'Hematology': 'scientific, blood-cell-inspired motifs, warm reds and clinical whites',
  'Rheumatology': 'supportive, movement-focused, gentle yet professional',
  'Nephrology': 'clean, kidney-aware motifs, clinical and reassuring',
};

const BRAND_DIRECTION_MAP: Record<string, string> = {
  'modern': 'contemporary, forward-looking, cutting-edge design',
  'compassionate': 'warm, empathetic, patient-centered, caring',
  'premium': 'high-end, polished, authoritative, sophisticated',
  'clinical': 'clean, precise, scientifically credible, medical',
  'human-centered': 'people-first, approachable, inclusive, community',
  'innovative': 'technology-forward, breakthrough, pioneering',
  'global': 'culturally inclusive, international, universal appeal',
  'minimal': 'simple, focused, uncluttered, essential',
};

const VISUAL_PREFERENCE_MAP: Record<string, string> = {
  'icon-based': 'symbol or icon paired with study name',
  'text-based': 'typography-driven wordmark',
  'abstract-symbol': 'geometric or abstract mark',
  'scientific-motif': 'molecular, cellular, or anatomical forms',
  'human-centered-motif': 'people, hands, community imagery',
};

export interface BuildPromptExtraContext {
  styleDescription?: string;
  customPrompt?: string;
}

export function buildPrompt(
  inputs: BFBrandInputs,
  generationStyleId: string,
  extraContext?: BuildPromptExtraContext,
): string {
  const parts: string[] = [];

  const name = inputs.study_name ?? inputs.brand_name ?? 'Clinical Study';
  parts.push(`Create a professional clinical study logo for "${name}"`);

  if (inputs.tagline) {
    parts.push(`with tagline "${inputs.tagline}"`);
  }

  const ta = inputs.therapeutic_area ?? inputs.industry ?? 'Healthcare';
  parts.push(`for a ${ta} clinical trial.`);

  if (inputs.indication) {
    parts.push(`The study focuses on ${inputs.indication}.`);
  }

  const genStyle = STYLE_MAP[generationStyleId];
  if (genStyle) {
    parts.push(`Style: ${genStyle}.`);
  }

  const therapeuticGuidance = THERAPEUTIC_VISUAL_MAP[ta];
  if (therapeuticGuidance) {
    parts.push(`Therapeutic visual direction: ${therapeuticGuidance}.`);
  }

  if (inputs.brand_direction && inputs.brand_direction.length > 0) {
    const directionDescs = inputs.brand_direction
      .map((d) => BRAND_DIRECTION_MAP[d])
      .filter(Boolean);
    if (directionDescs.length > 0) {
      parts.push(`Brand mood: ${directionDescs.join(', ')}.`);
    }
  }

  if (inputs.visual_preference && VISUAL_PREFERENCE_MAP[inputs.visual_preference]) {
    parts.push(`Visual approach: ${VISUAL_PREFERENCE_MAP[inputs.visual_preference]}.`);
  }

  if (inputs.severity === 'life-threatening' || inputs.severity === 'severe') {
    parts.push('Serious, respectful tone. Must convey trust and hope without trivializing the condition.');
  } else if (inputs.severity === 'mild') {
    parts.push('Approachable, optimistic tone.');
  }

  if (inputs.is_patient_facing) {
    parts.push('Patient-facing: warmer, simpler, more human-centered design.');
  }

  if (inputs.patient_population) {
    if (inputs.patient_population.toLowerCase().includes('pediatric') ||
        inputs.patient_population.toLowerCase().includes('child')) {
      parts.push('Gentle, reassuring, family-inclusive visual approach.');
    }
  }

  if (inputs.keywords && inputs.keywords.length > 0) {
    parts.push(`Key concepts: ${inputs.keywords.join(', ')}.`);
  }

  if (inputs.preferred_colors && inputs.preferred_colors.length > 0) {
    parts.push(`Color palette: ${inputs.preferred_colors.join(', ')}.`);
  }

  const styleDesc = extraContext?.styleDescription?.trim();
  if (styleDesc) {
    parts.push(`Reference style: ${styleDesc}`);
  }

  const custom = extraContext?.customPrompt?.trim();
  if (custom) {
    parts.push(custom);
  }

  parts.push('Vector SVG format, clean lines, scalable, professional quality, on a transparent or white background. Appropriate for clinical trial use.');

  return parts.join(' ');
}
