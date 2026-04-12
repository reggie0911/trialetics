import type { SupabaseClient } from '@supabase/supabase-js';

import { MOCKUP_CATEGORIES, MOCKUP_TYPES } from '@/lib/types/brand-forge';

/** Shared max length for `promptOverride`, gallery edits, and persisted `bf_mockups.prompt`. */
export const MOCKUP_PROMPT_MAX_LENGTH = 8000;

export const MOCKUP_CUSTOM_HINT_MAX_LENGTH = 500;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function trimCustomHint(input: string | undefined | null): string {
  return (typeof input === 'string' ? input : '').trim().slice(0, MOCKUP_CUSTOM_HINT_MAX_LENGTH);
}

export function validatePromptOverride(
  raw: string | undefined | null,
): { ok: true; value: string } | { ok: false; error: string } {
  if (raw == null || typeof raw !== 'string') {
    return { ok: false, error: 'Prompt cannot be empty' };
  }
  const t = raw.trim();
  if (t.length === 0) return { ok: false, error: 'Prompt cannot be empty' };
  if (t.length > MOCKUP_PROMPT_MAX_LENGTH) {
    return {
      ok: false,
      error: `Prompt must be at most ${MOCKUP_PROMPT_MAX_LENGTH} characters`,
    };
  }
  return { ok: true, value: t };
}

export function validateStoredMockupPromptFields(prompt: string | null, customHint: string | null): {
  ok: true;
  prompt: string | null;
  customHint: string | null;
} | { ok: false; error: string } {
  const h = customHint == null ? null : trimCustomHint(customHint);
  if (h && h.length > MOCKUP_CUSTOM_HINT_MAX_LENGTH) {
    return { ok: false, error: `Notes must be at most ${MOCKUP_CUSTOM_HINT_MAX_LENGTH} characters` };
  }
  if (prompt == null || prompt === '') {
    return { ok: true, prompt: null, customHint: h };
  }
  const p = prompt.trim();
  if (p.length > MOCKUP_PROMPT_MAX_LENGTH) {
    return { ok: false, error: `Prompt must be at most ${MOCKUP_PROMPT_MAX_LENGTH} characters` };
  }
  return { ok: true, prompt: p || null, customHint: h };
}

// ---------------------------------------------------------------------------
// Prompt templates (single source of truth for preview + generate)
// ---------------------------------------------------------------------------

interface MockupContext {
  studyName: string;
  therapeuticArea: string;
  colors: string;
  mood: string;
}

type PromptBuilder = (ctx: MockupContext) => string;

const BASE_STYLE = 'Photorealistic professional mockup, studio lighting, clean minimal background.';

const PROMPT_BUILDERS: Record<string, PromptBuilder> = {
  'logo-light': (ctx) =>
    `${BASE_STYLE} Logo for "${ctx.studyName}" clinical study centered on a clean white background. Simple, elegant presentation. Colors: ${ctx.colors}.`,
  'logo-dark': (ctx) =>
    `${BASE_STYLE} Logo for "${ctx.studyName}" clinical study centered on a dark charcoal/navy background. Simple, elegant presentation. Colors: ${ctx.colors}.`,
  'logo-bw': (ctx) =>
    `${BASE_STYLE} Monochrome black-and-white version of the "${ctx.studyName}" clinical study logo on white background. No color, only grayscale.`,
  'icon-mark': (ctx) =>
    `${BASE_STYLE} Minimal abstract symbol/icon mark for "${ctx.studyName}" clinical study. Simple geometric brand mark on white background. Colors: ${ctx.colors}.`,
  'favicon': (ctx) =>
    `${BASE_STYLE} Small app icon / favicon for "${ctx.studyName}" clinical study. Tiny square icon, simple recognizable mark, colors: ${ctx.colors}. Shown at browser-tab scale.`,
  'wordmark': (ctx) =>
    `${BASE_STYLE} Clean typographic wordmark for "${ctx.studyName}" clinical study. Text-only logo, professional font, on white background. Colors: ${ctx.colors}.`,
  'website-header': (ctx) =>
    `Professional website hero section for "${ctx.studyName}" ${ctx.therapeuticArea} clinical trial. Modern design, headline area, CTA button placeholder. Colors: ${ctx.colors}. ${ctx.mood}. Desktop browser mockup.`,
  'landing-page': (ctx) =>
    `Professional landing page above-the-fold for "${ctx.studyName}" ${ctx.therapeuticArea} study. Hero image area, headline, enrollment CTA. Colors: ${ctx.colors}. ${ctx.mood}. Desktop browser frame.`,
  'mobile-app': (ctx) =>
    `Mobile app screen for "${ctx.studyName}" clinical study. iPhone mockup showing a branded patient-facing app interface. Colors: ${ctx.colors}. ${ctx.mood}. Clean UI.`,
  'social-profile': (ctx) =>
    `Square social media profile image for "${ctx.studyName}" clinical study. Simple brand mark or initial on colored background. Colors: ${ctx.colors}. Clean, recognizable at small size.`,
  'social-post': (ctx) =>
    `Social media post template for "${ctx.studyName}" ${ctx.therapeuticArea} clinical study. Square format with branded header, text area, and logo placement. Colors: ${ctx.colors}. ${ctx.mood}.`,
  'email-signature': (ctx) =>
    `Professional email signature banner for "${ctx.studyName}" clinical study. Horizontal format with logo area, study name, and contact placeholder. Colors: ${ctx.colors}. Clean corporate design.`,
  'business-card': (ctx) =>
    `${BASE_STYLE} Business card mockup for "${ctx.studyName}" clinical study team. Front side with logo, name field, and contact info. Colors: ${ctx.colors}. Professional medical.`,
  'letterhead': (ctx) =>
    `${BASE_STYLE} Branded letterhead for "${ctx.studyName}" clinical study. A4 page with header logo, footer contact, and body text area. Colors: ${ctx.colors}. Professional stationery.`,
  'presentation-cover': (ctx) =>
    `Professional PowerPoint/Keynote cover slide for "${ctx.studyName}" ${ctx.therapeuticArea} clinical study. Title slide with study name, sponsor logo area. Colors: ${ctx.colors}. ${ctx.mood}. 16:9 aspect.`,
  'brochure-cover': (ctx) =>
    `${BASE_STYLE} Patient brochure cover for "${ctx.studyName}" ${ctx.therapeuticArea} study. Portrait format, welcoming design, study name prominent. Colors: ${ctx.colors}. ${ctx.mood}. Approachable and clear.`,
  'report-cover': (ctx) =>
    `${BASE_STYLE} Report cover page for "${ctx.studyName}" ${ctx.therapeuticArea} study. Portrait format, professional medical document cover with study name and logo area. Colors: ${ctx.colors}.`,
  'flyer': (ctx) =>
    `${BASE_STYLE} Branded flyer for "${ctx.studyName}" ${ctx.therapeuticArea} study. Portrait format, eye-catching headline area, CTA, professional medical marketing. Colors: ${ctx.colors}. ${ctx.mood}.`,
  'poster': (ctx) =>
    `${BASE_STYLE} Large-format poster for "${ctx.studyName}" ${ctx.therapeuticArea} study. Bold headline, imagery area, enrollment information. Colors: ${ctx.colors}. ${ctx.mood}. Professional medical display.`,
  'banner-ad': (ctx) =>
    `Digital banner advertisement for "${ctx.studyName}" ${ctx.therapeuticArea} clinical study. Horizontal web banner with headline, CTA button, and branding. Colors: ${ctx.colors}. ${ctx.mood}.`,
  'recruitment-ad': (ctx) =>
    `Social media recruitment ad for "${ctx.studyName}" ${ctx.therapeuticArea} clinical trial. Square format, "Are You Eligible?" or similar CTA. Diverse patient representation. Colors: ${ctx.colors}. ${ctx.mood}.`,
  'newsletter-header': (ctx) =>
    `Branded newsletter header banner for "${ctx.studyName}" ${ctx.therapeuticArea} study. Horizontal format with study logo, title, and decorative elements. Colors: ${ctx.colors}. ${ctx.mood}.`,
  'tote-bag': (ctx) =>
    `${BASE_STYLE} Canvas tote bag with "${ctx.studyName}" clinical study branding. Logo printed on natural canvas bag, lying flat on surface. Colors: ${ctx.colors}. Event giveaway style.`,
  'notebook': (ctx) =>
    `${BASE_STYLE} Branded notebook for "${ctx.studyName}" clinical study. Hardcover notebook with logo on front cover, lying on desk. Colors: ${ctx.colors}. Professional.`,
  'pen': (ctx) =>
    `${BASE_STYLE} Branded pen with "${ctx.studyName}" clinical study logo. Close-up product shot of a professional pen. Colors: ${ctx.colors}. Corporate merchandise.`,
  'mug': (ctx) =>
    `${BASE_STYLE} Branded coffee mug with "${ctx.studyName}" clinical study logo. White ceramic mug on desk. Colors: ${ctx.colors}. Professional merchandise product photo only; no people, no faces, no portraits.`,
  'tshirt': (ctx) =>
    `${BASE_STYLE} Branded t-shirt with "${ctx.studyName}" clinical study logo. Folded polo or t-shirt showing logo on chest. Colors: ${ctx.colors}. Event apparel.`,
  'badge-id': (ctx) =>
    `${BASE_STYLE} Staff ID badge for "${ctx.studyName}" clinical study. Lanyard badge with logo, name field, role field, and photo placeholder. Colors: ${ctx.colors}. Professional medical.`,
  'study-flyer': (ctx) =>
    `${BASE_STYLE} Patient recruitment flyer for "${ctx.studyName}" ${ctx.therapeuticArea} clinical trial. Portrait format, "Are You Eligible?" headline, diverse patient imagery. Colors: ${ctx.colors}. ${ctx.mood}. Compliant and approachable.`,
  'patient-brochure': (ctx) =>
    `${BASE_STYLE} Patient information brochure cover for "${ctx.studyName}" ${ctx.therapeuticArea} study. Portrait, welcoming, informative. Colors: ${ctx.colors}. ${ctx.mood}. Accessible and clear.`,
  'siv-deck': (ctx) =>
    `Professional SIV deck title slide for "${ctx.studyName}" ${ctx.therapeuticArea} clinical trial. Site Initiation Visit presentation cover. Colors: ${ctx.colors}. ${ctx.mood}. 16:9 corporate slide.`,
  'investigator-slide': (ctx) =>
    `Professional investigator meeting slide for "${ctx.studyName}" ${ctx.therapeuticArea} study. Title slide with study branding. Colors: ${ctx.colors}. ${ctx.mood}. 16:9 corporate presentation.`,
  'recruitment-social': (ctx) =>
    `Social media recruitment ad for "${ctx.studyName}" ${ctx.therapeuticArea} clinical trial. Square format, empathetic tone, diverse representation. Colors: ${ctx.colors}. ${ctx.mood}.`,
  'study-newsletter': (ctx) =>
    `Study newsletter header for "${ctx.studyName}" ${ctx.therapeuticArea} clinical trial updates. Branded banner with study name. Colors: ${ctx.colors}. ${ctx.mood}. Professional medical.`,
  'faq-sheet': (ctx) =>
    `${BASE_STYLE} FAQ sheet cover for "${ctx.studyName}" ${ctx.therapeuticArea} study. Document cover with "Frequently Asked Questions" title and study branding. Colors: ${ctx.colors}.`,
  'site-binder': (ctx) =>
    `${BASE_STYLE} 3D mockup of a branded clinical trial binder on a desk. Binder cover shows "${ctx.studyName}" and sponsor logo area. Colors: ${ctx.colors}. Professional medical office setting.`,
  'training-guide': (ctx) =>
    `${BASE_STYLE} Training guide cover for "${ctx.studyName}" ${ctx.therapeuticArea} study. Document with "Training Guide" title and study branding. Colors: ${ctx.colors}. Professional.`,
  'quick-ref-card': (ctx) =>
    `${BASE_STYLE} Pocket-sized quick-reference card for "${ctx.studyName}" ${ctx.therapeuticArea} study. Small horizontal card with key study info areas and logo. Colors: ${ctx.colors}.`,
};

export const PRIMARY_LOGO_REFERENCE_SUFFIX =
  ' The reference image is the approved primary logo artwork from the brand kit. Reproduce this exact logo only—same mark, typography, and layout—placed on the product or scene. Do not invent a different brand name, wordmark, or symbol. Do not substitute stock logos or generic text. No people or portraits unless the mockup type explicitly requires human subjects. Apply any color treatment described above (e.g. monochrome) to the logo only as specified.';

export const MOCKUP_TEXT_TO_IMAGE_MODEL = 'black-forest-labs/flux-1.1-pro';
export const MOCKUP_LOGO_CONDITIONED_MODEL = 'black-forest-labs/flux-kontext-pro';

export type ResolveMockupPromptResult =
  | {
      ok: true;
      prompt: string;
      hintTrimmed: string | null;
      usesPrimaryLogo: boolean;
      primaryLogoImageUrl: string | null;
      aspectRatio: string;
      mockupLabel: string;
      categoryLabel: string;
      mockupType: string;
    }
  | { ok: false; error: string; status: number };

/**
 * Resolves the image prompt and (optional) signed URL for Flux Kontext reference image.
 * When `promptOverride` is set, it becomes the full model prompt (no template / logo suffix appended).
 */
export async function resolveMockupPromptContext(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    projectId: string;
    mockupType: string;
    customHint?: string | null;
    /** Full prompt from user — skips template when valid. */
    promptOverride?: string | null;
    /** Optional concept id with PNG; must belong to project. */
    referenceConceptId?: string | null;
  },
): Promise<ResolveMockupPromptResult> {
  const { companyId, projectId, mockupType } = params;
  const typeConfig = MOCKUP_TYPES.find((t) => t.id === mockupType);
  if (!typeConfig) {
    return { ok: false, error: `Unknown mockup type: ${mockupType}`, status: 400 };
  }
  const promptBuilder = PROMPT_BUILDERS[mockupType];
  if (!promptBuilder) {
    return { ok: false, error: `No prompt template for: ${mockupType}`, status: 400 };
  }

  const mockupLabel = typeConfig.label;
  const categoryLabel =
    MOCKUP_CATEGORIES.find((c) => c.id === typeConfig.category)?.label ?? typeConfig.category;

  const { data: project } = await supabase
    .from('bf_projects')
    .select('id')
    .eq('id', projectId)
    .eq('company_id', companyId)
    .single();
  if (!project) {
    return { ok: false, error: 'Project not found', status: 404 };
  }

  const { data: inputs } = await supabase.from('bf_brand_inputs').select('*').eq('project_id', projectId).single();
  if (!inputs) {
    return { ok: false, error: 'No brand inputs found', status: 404 };
  }

  const { data: direction } = await supabase
    .from('bf_brand_directions')
    .select('mood, color_palette')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const colorList = direction?.color_palette
    ? (direction.color_palette as Array<{ hex: string }>).map((c) => c.hex).join(', ')
    : (inputs.preferred_colors as string[])?.join(', ') ?? '#003049, #2a9d8f, #e9c46a';

  const ctx: MockupContext = {
    studyName: (inputs.study_name || inputs.brand_name) as string,
    therapeuticArea: (inputs.therapeutic_area || 'Clinical') as string,
    colors: colorList,
    mood: (direction?.mood as string) ?? 'professional clinical trial branding',
  };

  const hintTrimmedRaw = trimCustomHint(params.customHint);
  const hintTrimmed = hintTrimmedRaw.length > 0 ? hintTrimmedRaw : null;

  const logoResult = await resolveMockupReferenceImageUrl(supabase, {
    companyId,
    projectId,
    referenceConceptId: params.referenceConceptId?.trim() || null,
  });

  if ('error' in logoResult && logoResult.error) {
    return { ok: false, error: logoResult.error, status: 400 };
  }

  const primaryLogoImageUrl = logoResult.url;
  const usesPrimaryLogo = primaryLogoImageUrl != null;

  let prompt: string;
  if (params.promptOverride != null && params.promptOverride !== '') {
    const v = validatePromptOverride(params.promptOverride);
    if (!v.ok) return { ok: false, error: v.error, status: 400 };
    prompt = v.value;
  } else {
    prompt = promptBuilder(ctx);
    if (hintTrimmed) {
      prompt += ` User emphasis: ${hintTrimmed}`;
    }
  }

  if (usesPrimaryLogo && !prompt.includes(PRIMARY_LOGO_REFERENCE_SUFFIX.trim().slice(0, 60))) {
    prompt += PRIMARY_LOGO_REFERENCE_SUFFIX;
  }

  return {
    ok: true,
    prompt,
    hintTrimmed,
    usesPrimaryLogo,
    primaryLogoImageUrl,
    aspectRatio: typeConfig.aspectRatio,
    mockupLabel,
    categoryLabel,
    mockupType,
  };
}

/**
 * Storage path used for gallery presence checks and the reference-option list.
 * Prefers PNG (raster thumbnails render predictably in <img> tags).
 */
export function conceptLogoReferenceStoragePath(concept: {
  png_storage_path: string | null;
  svg_storage_path?: string | null;
}): string | null {
  const png = typeof concept.png_storage_path === 'string' ? concept.png_storage_path.trim() : '';
  if (png) return png;
  const svg = typeof concept.svg_storage_path === 'string' ? concept.svg_storage_path.trim() : '';
  if (svg) return svg;
  return null;
}

/**
 * Storage path used as the actual reference image sent to Flux Kontext for mockup generation.
 * Must be a raster format — flux-kontext-pro does not accept SVG input.
 * Returns the PNG path (now rendered at 1024 px for quality), never SVG.
 */
function conceptLogoMockupReferencePath(concept: {
  png_storage_path: string | null;
  svg_storage_path?: string | null;
}): string | null {
  const png = typeof concept.png_storage_path === 'string' ? concept.png_storage_path.trim() : '';
  if (png) return png;
  return null;
}

async function resolveMockupReferenceImageUrl(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    projectId: string;
    referenceConceptId: string | null;
  },
): Promise<{ url: string | null } | { url: null; error: string }> {
  const { companyId, projectId, referenceConceptId } = params;

  const { data: project } = await supabase
    .from('bf_projects')
    .select('id')
    .eq('id', projectId)
    .eq('company_id', companyId)
    .single();
  if (!project) return { url: null };

  let storagePath: string | null = null;

  if (referenceConceptId) {
    if (!isValidUuid(referenceConceptId)) {
      return { url: null, error: 'Invalid reference artwork selection' };
    }
    const { data: concept } = await supabase
      .from('bf_logo_concepts')
      .select('id, png_storage_path, svg_storage_path')
      .eq('id', referenceConceptId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (!concept) {
      return { url: null, error: 'Reference artwork was not found' };
    }
    storagePath = conceptLogoMockupReferencePath(concept);
    if (!storagePath) {
      return { url: null, error: 'Reference artwork has no PNG or SVG file in storage' };
    }
  } else {
    const { data: brandKit } = await supabase
      .from('bf_brand_kits')
      .select('primary_logo_concept_id')
      .eq('project_id', projectId)
      .maybeSingle();
    if (!brandKit?.primary_logo_concept_id) {
      return { url: null };
    }
    const { data: logoConcept } = await supabase
      .from('bf_logo_concepts')
      .select('png_storage_path, svg_storage_path')
      .eq('id', brandKit.primary_logo_concept_id)
      .eq('project_id', projectId)
      .maybeSingle();
    storagePath = logoConcept ? conceptLogoMockupReferencePath(logoConcept) : null;
  }

  if (!storagePath) return { url: null };

  const { data: signedLogo } = await supabase.storage
    .from('brandforge-assets')
    .createSignedUrl(storagePath, 3600);

  return { url: signedLogo?.signedUrl ?? null };
}

export function aspectRatioLabel(aspect: string): string {
  const map: Record<string, string> = {
    '1:1': 'Square',
    '16:9': 'Landscape',
    '9:16': 'Portrait',
    '3:4': 'Portrait',
  };
  return map[aspect] ?? aspect;
}
