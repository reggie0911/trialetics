import { z } from 'zod';

// ---------------------------------------------------------------------------
// Database row interfaces
// ---------------------------------------------------------------------------

export interface BFProject {
  id: string;
  company_id: string;
  created_by: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface BFBrandInputs {
  id: string;
  project_id: string;
  // Legacy fields (kept for backward compat)
  brand_name: string | null;
  tagline: string | null;
  industry: string | null;
  keywords: string[];
  preferred_colors: string[];
  style_preset: string | null;
  icon_preference: string | null;
  typography_preference: string | null;
  // Study basics
  study_name: string | null;
  protocol_number: string | null;
  sponsor: string | null;
  cro: string | null;
  phase: string | null;
  trial_type: string | null;
  // Medical context
  therapeutic_area: string | null;
  indication: string | null;
  patient_population: string | null;
  device_or_drug: string | null;
  severity: string | null;
  countries: string[];
  // Communication
  communication_goals: string[];
  target_audience: string[];
  is_patient_facing: boolean;
  // Brand direction
  brand_direction: string[];
  visual_preference: string | null;
  /** User-authored notes for the Imagery workspace (optional). */
  additional_imagery_guidelines: string | null;
  created_at: string;
  updated_at: string;
}

export interface BFLogoConcept {
  id: string;
  project_id: string;
  prompt: string | null;
  svg_storage_path: string | null;
  png_storage_path: string | null;
  thumbnail_url: string | null;
  is_favorite: boolean;
  is_selected: boolean;
  generation_metadata: BFGenerationMetadata;
  created_at: string;
}

export interface BFGenerationMetadata {
  source?: 'native-svg' | 'auto-traced' | 'embedded-raster' | 'uploaded';
  model?: string;
  prompt?: string;
  style_preset?: string;
  parent_concept_id?: string;
  styleDescription?: string;
  customPrompt?: string;
  postProcessing?: string[];
}

export interface BFColorSwatch {
  name: string;
  hex: string;
  usage: 'primary' | 'secondary' | 'accent' | 'neutral' | 'recruitment' | 'patient-facing';
  rationale?: string;
}

export interface BFFontPairingSelection {
  pairing_id: string;
}

export interface BFBrandKit {
  id: string;
  project_id: string;
  primary_logo_concept_id: string | null;
  secondary_logo_concept_id: string | null;
  icon_mark_concept_id: string | null;
  color_palette: BFColorSwatch[];
  font_pairing: BFFontPairingSelection;
  brand_voice_summary: string;
  usage_guidance: string;
  created_at: string;
  updated_at: string;
}

export interface BFExport {
  id: string;
  project_id: string;
  brand_kit_id: string | null;
  export_type: 'svg' | 'png' | 'favicon' | 'zip' | 'pdf';
  storage_path: string | null;
  file_name: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// New table interfaces
// ---------------------------------------------------------------------------

export interface BFBrandDirection {
  id: string;
  project_id: string;
  mood: string | null;
  visual_direction: string | null;
  color_palette: BFColorSwatch[];
  typography_recommendations: Record<string, unknown>;
  icon_style: string | null;
  imagery_direction: string | null;
  logo_directions: Array<{ style: string; description: string }>;
  tagline_options: string[];
  patient_communication_style: string | null;
  tone_variants: Record<string, string>;
  created_at: string;
}

export interface BFRecruitmentKit {
  id: string;
  project_id: string;
  campaign_palette: BFColorSwatch[];
  headline_styles: Array<{ template: string; tone: string }>;
  brochure_tone: string | null;
  social_ad_direction: string | null;
  diversity_imagery_guidance: string | null;
  cta_styles: Array<{ label: string; color: string; urgency: string }>;
  created_at: string;
  updated_at: string;
}

export interface BFMaterialTheme {
  id: string;
  project_id: string;
  siv_deck_styling: Record<string, unknown>;
  monitoring_visit_styling: Record<string, unknown>;
  newsletter_styling: Record<string, unknown>;
  training_manual_styling: Record<string, unknown>;
  powerpoint_theme: Record<string, unknown>;
  pdf_styling: Record<string, unknown>;
  one_pager_layout: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Workspace checklist on the study overview (derived from persisted project data). */
export interface BFWorkspaceStatus {
  logos: boolean;
  colors: boolean;
  typography: boolean;
  imagery: boolean;
  mockups: boolean;
  recruitment: boolean;
  templates: boolean;
}

export interface BFMockup {
  id: string;
  project_id: string;
  mockup_type: string;
  storage_path: string;
  prompt: string | null;
  custom_hint: string | null;
  is_favorite: boolean;
  created_at: string;
}

export type MockupCategoryId = 'core-brand' | 'digital' | 'print-document' | 'marketing' | 'branded-assets' | 'clinical-trial';

export const MOCKUP_CATEGORIES: { id: MockupCategoryId; label: string }[] = [
  { id: 'core-brand', label: 'Core Brand' },
  { id: 'digital', label: 'Digital' },
  { id: 'print-document', label: 'Print / Document' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'branded-assets', label: 'Branded Assets' },
  { id: 'clinical-trial', label: 'Clinical Trial' },
];

export interface MockupTypeConfig {
  id: string;
  label: string;
  description: string;
  category: MockupCategoryId;
  aspectRatio: '1:1' | '16:9' | '9:16' | '3:4';
  mvp: boolean;
}

export const MOCKUP_TYPES: MockupTypeConfig[] = [
  // Core Brand
  { id: 'logo-light', label: 'Logo on White', description: 'Logo presented on a clean white background', category: 'core-brand', aspectRatio: '1:1', mvp: true },
  { id: 'logo-dark', label: 'Logo on Dark', description: 'Logo presented on a dark background', category: 'core-brand', aspectRatio: '1:1', mvp: true },
  { id: 'logo-bw', label: 'Black & White Logo', description: 'Monochrome version of the logo', category: 'core-brand', aspectRatio: '1:1', mvp: false },
  { id: 'icon-mark', label: 'Icon Mark / Symbol', description: 'Symbol-only version of the brand', category: 'core-brand', aspectRatio: '1:1', mvp: false },
  { id: 'favicon', label: 'Favicon / App Icon', description: 'Small icon for browser tabs or app', category: 'core-brand', aspectRatio: '1:1', mvp: false },
  { id: 'wordmark', label: 'Wordmark Variation', description: 'Text-only logo treatment', category: 'core-brand', aspectRatio: '16:9', mvp: false },

  // Digital
  { id: 'website-header', label: 'Website Header', description: 'Hero section of a study website', category: 'digital', aspectRatio: '16:9', mvp: true },
  { id: 'landing-page', label: 'Landing Page Header', description: 'Above-the-fold header for a landing page', category: 'digital', aspectRatio: '16:9', mvp: false },
  { id: 'mobile-app', label: 'Mobile App Screen', description: 'Branded mobile app interface', category: 'digital', aspectRatio: '9:16', mvp: false },
  { id: 'social-profile', label: 'Social Profile Icon', description: 'Square profile image for social accounts', category: 'digital', aspectRatio: '1:1', mvp: true },
  { id: 'social-post', label: 'Social Media Post', description: 'Branded post template for social media', category: 'digital', aspectRatio: '1:1', mvp: false },
  { id: 'email-signature', label: 'Email Signature', description: 'Branded email signature banner', category: 'digital', aspectRatio: '16:9', mvp: true },

  // Print / Document
  { id: 'business-card', label: 'Business Card', description: 'Study team contact card', category: 'print-document', aspectRatio: '16:9', mvp: false },
  { id: 'letterhead', label: 'Letterhead', description: 'Branded letter / stationery template', category: 'print-document', aspectRatio: '3:4', mvp: false },
  { id: 'presentation-cover', label: 'Presentation Cover', description: 'Title slide for study presentations', category: 'print-document', aspectRatio: '16:9', mvp: true },
  { id: 'brochure-cover', label: 'Brochure Cover', description: 'Patient brochure or one-pager cover', category: 'print-document', aspectRatio: '3:4', mvp: true },
  { id: 'report-cover', label: 'Report / PDF Cover', description: 'Cover page for study reports or PDFs', category: 'print-document', aspectRatio: '3:4', mvp: false },

  // Marketing
  { id: 'flyer', label: 'Flyer', description: 'General-purpose branded flyer', category: 'marketing', aspectRatio: '9:16', mvp: true },
  { id: 'poster', label: 'Poster', description: 'Large-format display poster', category: 'marketing', aspectRatio: '9:16', mvp: false },
  { id: 'banner-ad', label: 'Banner Ad', description: 'Digital banner advertisement', category: 'marketing', aspectRatio: '16:9', mvp: false },
  { id: 'recruitment-ad', label: 'Recruitment Ad', description: 'Patient recruitment social ad', category: 'marketing', aspectRatio: '1:1', mvp: false },
  { id: 'newsletter-header', label: 'Newsletter Header', description: 'Branded banner for study newsletters', category: 'marketing', aspectRatio: '16:9', mvp: false },

  // Branded Assets
  { id: 'tote-bag', label: 'Tote Bag', description: 'Branded tote bag for events', category: 'branded-assets', aspectRatio: '1:1', mvp: false },
  { id: 'notebook', label: 'Notebook', description: 'Branded study notebook', category: 'branded-assets', aspectRatio: '3:4', mvp: false },
  { id: 'pen', label: 'Pen', description: 'Branded pen with study mark', category: 'branded-assets', aspectRatio: '16:9', mvp: false },
  { id: 'mug', label: 'Mug', description: 'Branded coffee mug', category: 'branded-assets', aspectRatio: '1:1', mvp: false },
  { id: 'tshirt', label: 'T-Shirt', description: 'Branded apparel', category: 'branded-assets', aspectRatio: '3:4', mvp: false },
  { id: 'badge-id', label: 'Badge / ID Card', description: 'Staff ID or event badge', category: 'branded-assets', aspectRatio: '3:4', mvp: false },

  // Clinical Trial
  { id: 'study-flyer', label: 'Study Flyer', description: 'Clinical trial recruitment flyer', category: 'clinical-trial', aspectRatio: '9:16', mvp: false },
  { id: 'patient-brochure', label: 'Patient Brochure Cover', description: 'Patient-facing information brochure', category: 'clinical-trial', aspectRatio: '3:4', mvp: false },
  { id: 'siv-deck', label: 'SIV Presentation Cover', description: 'Site Initiation Visit deck title slide', category: 'clinical-trial', aspectRatio: '16:9', mvp: false },
  { id: 'investigator-slide', label: 'Investigator Meeting Slide', description: 'Slide for investigator meetings', category: 'clinical-trial', aspectRatio: '16:9', mvp: false },
  { id: 'recruitment-social', label: 'Recruitment Social Ad', description: 'Social media recruitment creative', category: 'clinical-trial', aspectRatio: '1:1', mvp: false },
  { id: 'study-newsletter', label: 'Study Newsletter Header', description: 'Newsletter banner for study updates', category: 'clinical-trial', aspectRatio: '16:9', mvp: false },
  { id: 'faq-sheet', label: 'FAQ Sheet Cover', description: 'Frequently asked questions document cover', category: 'clinical-trial', aspectRatio: '3:4', mvp: false },
  { id: 'site-binder', label: 'Site Binder Cover', description: '3D clinical trial binder mockup', category: 'clinical-trial', aspectRatio: '3:4', mvp: false },
  { id: 'training-guide', label: 'Training Guide Cover', description: 'Cover for site training materials', category: 'clinical-trial', aspectRatio: '3:4', mvp: false },
  { id: 'quick-ref-card', label: 'Quick-Reference Card', description: 'Pocket-sized study reference card', category: 'clinical-trial', aspectRatio: '16:9', mvp: false },
];

export interface BFBrandKitVersion {
  id: string;
  brand_kit_id: string;
  version_number: number;
  snapshot: Record<string, unknown>;
  changed_by: string;
  change_summary: string | null;
  created_at: string;
}

export interface BFShareLink {
  id: string;
  project_id: string;
  token: string;
  created_by: string;
  expires_at: string;
  revoked: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Clinical trial constants
// ---------------------------------------------------------------------------

export const THERAPEUTIC_AREAS = [
  'Oncology',
  'Cardiology',
  'Rare Disease',
  'Neurology',
  'Immunology',
  'Infectious Disease',
  'Endocrinology',
  'Dermatology',
  'Ophthalmology',
  'Respiratory',
  'Gastroenterology',
  'Hematology',
  'Psychiatry',
  'Rheumatology',
  'Nephrology',
  'Other',
] as const;

export const PHASES = [
  { id: 'phase-1', label: 'Phase I' },
  { id: 'phase-2', label: 'Phase II' },
  { id: 'phase-3', label: 'Phase III' },
  { id: 'phase-4', label: 'Phase IV' },
  { id: 'observational', label: 'Observational' },
  { id: 'registry', label: 'Registry' },
] as const;

export const TRIAL_TYPES = [
  { id: 'interventional', label: 'Interventional' },
  { id: 'observational', label: 'Observational' },
  { id: 'device', label: 'Device' },
  { id: 'drug', label: 'Drug' },
  { id: 'diagnostic', label: 'Diagnostic' },
  { id: 'combination', label: 'Combination' },
] as const;

export const COMMUNICATION_GOALS = [
  { id: 'patient-recruitment', label: 'Patient Recruitment' },
  { id: 'site-engagement', label: 'Site Engagement' },
  { id: 'investigator-alignment', label: 'Investigator Alignment' },
  { id: 'internal-branding', label: 'Internal Study Branding' },
  { id: 'executive-reporting', label: 'Executive Reporting' },
] as const;

export const TARGET_AUDIENCES = [
  { id: 'patients', label: 'Patients' },
  { id: 'sites', label: 'Sites' },
  { id: 'investigators', label: 'Investigators' },
  { id: 'internal-teams', label: 'Internal Sponsor Teams' },
  { id: 'executives', label: 'Investor / Executive Presentations' },
] as const;

export const BRAND_DIRECTIONS = [
  { id: 'modern', label: 'Modern', description: 'Contemporary, forward-looking design' },
  { id: 'compassionate', label: 'Compassionate', description: 'Warm, empathetic, patient-centered' },
  { id: 'premium', label: 'Premium', description: 'High-end, polished, authoritative' },
  { id: 'clinical', label: 'Clinical', description: 'Clean, precise, scientifically credible' },
  { id: 'human-centered', label: 'Human-centered', description: 'People-first, approachable, inclusive' },
  { id: 'innovative', label: 'Innovative', description: 'Cutting-edge, technology-forward' },
  { id: 'global', label: 'Global', description: 'Culturally inclusive, international appeal' },
  { id: 'minimal', label: 'Minimal', description: 'Simple, focused, uncluttered' },
] as const;

export const VISUAL_PREFERENCES = [
  { id: 'icon-based', label: 'Icon-based', description: 'Symbol or icon paired with name' },
  { id: 'text-based', label: 'Text-based', description: 'Typography-driven wordmark' },
  { id: 'abstract-symbol', label: 'Abstract Symbol', description: 'Geometric or abstract mark' },
  { id: 'scientific-motif', label: 'Scientific Motif', description: 'Inspired by molecular, cellular, or anatomical forms' },
  { id: 'human-centered-motif', label: 'Human-centered Motif', description: 'People, hands, community imagery' },
] as const;

export const SEVERITIES = [
  { id: 'mild', label: 'Mild' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'severe', label: 'Severe' },
  { id: 'life-threatening', label: 'Life-threatening' },
  { id: 'chronic', label: 'Chronic' },
] as const;

export const DEVICE_OR_DRUG_OPTIONS = [
  { id: 'device', label: 'Device' },
  { id: 'drug', label: 'Drug' },
  { id: 'biologic', label: 'Biologic' },
  { id: 'diagnostic', label: 'Diagnostic' },
  { id: 'combination', label: 'Combination' },
] as const;

/** Title-case words split on hyphen, underscore, or space (fallback when id is not in a known list). */
export function titleCaseSegmented(value: string): string {
  return value
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Human label for id-backed select values. Base UI Select shows the raw `value` on the closed trigger
 * unless the trigger value is mapped explicitly (e.g. via SelectValue `getDisplayLabel`).
 */
export function brandForgeOptionLabel<T extends { id: string; label: string }>(
  options: readonly T[],
  value: string | null | undefined,
): string | null {
  if (value == null || value === '') return null;
  const found = options.find((o) => o.id === value);
  if (found) return found.label;
  return titleCaseSegmented(value);
}

/** Canonical therapeutic area label (list is stored as display strings; normalizes casing). */
export function therapeuticAreaDisplayLabel(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  const match = THERAPEUTIC_AREAS.find((ta) => ta.toLowerCase() === value.toLowerCase());
  return match ?? titleCaseSegmented(value);
}

/** Display labels for palette / brand kit color `usage` roles (stored values are kebab-case ids). */
export const COLOR_SWATCH_USAGE_LABELS: Record<BFColorSwatch['usage'], string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  neutral: 'Neutral',
  recruitment: 'Recruitment',
  'patient-facing': 'Patient-facing',
};

export function colorSwatchUsageLabel(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  if (value in COLOR_SWATCH_USAGE_LABELS) {
    return COLOR_SWATCH_USAGE_LABELS[value as BFColorSwatch['usage']];
  }
  return titleCaseSegmented(value);
}

export interface LogoWorkspaceBriefSummary {
  primary: string;
  secondary: string | null;
}

/** Human-readable lines for the Logos workspace (matches prompt context from saved `bf_brand_inputs`). */
export function logoWorkspaceBriefSummary(
  inputs: BFBrandInputs | null,
  projectName: string,
): LogoWorkspaceBriefSummary {
  const nameFromInputs = inputs?.study_name?.trim() || inputs?.brand_name?.trim();
  const primary = nameFromInputs || projectName.trim() || 'Study';

  const area = inputs?.therapeutic_area
    ? therapeuticAreaDisplayLabel(inputs.therapeutic_area)
    : null;
  const indication = inputs?.indication?.trim() || null;
  const phase = inputs?.phase ? brandForgeOptionLabel(PHASES, inputs.phase) : null;
  const trial = inputs?.trial_type ? brandForgeOptionLabel(TRIAL_TYPES, inputs.trial_type) : null;

  const contextParts: string[] = [];
  if (area) contextParts.push(area);
  if (indication) contextParts.push(indication);
  const metaParts = [phase, trial].filter(Boolean) as string[];

  let secondary: string | null = null;
  if (contextParts.length > 0) {
    secondary = contextParts.join(' · ');
  }
  if (metaParts.length > 0) {
    const meta = metaParts.join(' · ');
    secondary = secondary ? `${secondary} · ${meta}` : meta;
  }

  return { primary, secondary };
}

// Keep GENERATION_STYLES for logo generation panel
export const GENERATION_STYLES = [
  { id: 'minimal-wordmark', label: 'Minimal Wordmark', description: 'Study name in clean typography with negative space' },
  { id: 'icon-text', label: 'Icon + Text', description: 'Abstract symbol paired with study name' },
  { id: 'lettermark', label: 'Lettermark', description: 'Stylized initials or monogram' },
  { id: 'abstract-symbol', label: 'Abstract Symbol', description: 'Geometric or organic shape representing the study' },
  { id: 'emblem-badge', label: 'Emblem / Badge', description: 'Study name enclosed in a shape or crest' },
] as const;

// Replicate model options for the generation panel
export const GENERATION_MODELS = [
  { id: 'ideogram-v3-turbo', label: 'Creative Concept', description: 'Rich, detailed concepts', tier: 'standard', cost: '$$', replicate: 'ideogram-ai/ideogram-v3-turbo' },
  { id: 'recraft-v4-svg', label: 'Vector Logo', description: 'Clean, scalable SVG output', tier: 'vector', cost: '$$', replicate: 'recraft-ai/recraft-v4-svg' },
  { id: 'recraft-v4-pro-svg', label: 'Premium Vector', description: 'Highest quality SVG', tier: 'vector', cost: '$$$', replicate: 'recraft-ai/recraft-v4-pro-svg' },
  { id: 'recraft-v4', label: 'Quick Concept', description: 'Fast design-aware raster', tier: 'quick', cost: '$', replicate: 'recraft-ai/recraft-v4' },
  { id: 'flux-kontext-pro', label: 'Style-Matched', description: 'Match a reference style', tier: 'standard', cost: '$$$', replicate: 'black-forest-labs/flux-kontext-pro' },
  { id: 'dreamina-3.1', label: 'Text-Forward', description: 'Precise text rendering', tier: 'standard', cost: '$$', replicate: 'bytedance/dreamina-3.1' },
  { id: 'flux-schnell', label: 'Fast Preview', description: 'Ultra-fast rough preview', tier: 'quick', cost: '$', replicate: 'black-forest-labs/flux-1-schnell' },
] as const;

export type GenerationModelId = (typeof GENERATION_MODELS)[number]['id'];

/** Human label for logo generation model ids (Base UI Select trigger shows raw value without this). */
export function generationModelDisplayLabel(modelId: string | null | undefined): string | null {
  if (modelId == null || modelId === '') return null;
  const m = GENERATION_MODELS.find((x) => x.id === modelId);
  return m?.label ?? titleCaseSegmented(modelId.replace(/-/g, ' '));
}

// ---------------------------------------------------------------------------
// Legacy constants (kept for backward compat with existing projects)
// ---------------------------------------------------------------------------

export const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce',
  'Food & Beverage', 'Fashion', 'Real Estate', 'Travel', 'Entertainment',
  'Sports & Fitness', 'Agriculture', 'Energy', 'Non-profit', 'Legal',
  'Consulting', 'Manufacturing', 'Media', 'Automotive', 'Other',
] as const;

export const STYLE_PRESETS = [
  { id: 'minimal', label: 'Minimal', description: 'Clean lines, lots of whitespace' },
  { id: 'bold', label: 'Bold', description: 'Strong colors, heavy weight' },
  { id: 'vintage', label: 'Vintage', description: 'Retro-inspired, classic feel' },
  { id: 'modern', label: 'Modern', description: 'Contemporary, sleek design' },
  { id: 'playful', label: 'Playful', description: 'Fun, energetic, colorful' },
  { id: 'corporate', label: 'Corporate', description: 'Professional, trustworthy' },
] as const;

export const ICON_PREFERENCES = [
  { id: 'wordmark', label: 'Wordmark', description: 'Text-only logo' },
  { id: 'lettermark', label: 'Lettermark', description: 'Initials / monogram' },
  { id: 'icon-text', label: 'Icon + Text', description: 'Symbol paired with name' },
  { id: 'abstract', label: 'Abstract', description: 'Geometric / abstract mark' },
  { id: 'mascot', label: 'Mascot', description: 'Character-based logo' },
] as const;

export const TYPOGRAPHY_PREFERENCES = [
  { id: 'serif', label: 'Serif', description: 'Traditional, elegant' },
  { id: 'sans-serif', label: 'Sans-serif', description: 'Clean, modern' },
  { id: 'slab', label: 'Slab', description: 'Bold, impactful' },
  { id: 'display', label: 'Display', description: 'Decorative, unique' },
  { id: 'handwritten', label: 'Handwritten', description: 'Personal, organic' },
] as const;

// ---------------------------------------------------------------------------
// Form schema and helpers
// ---------------------------------------------------------------------------

export const brandBriefSchema = z.object({
  // Study basics
  study_name: z.string().min(1, 'Study name is required').max(200),
  protocol_number: z.string().max(100).optional().default(''),
  sponsor: z.string().max(200).optional().default(''),
  cro: z.string().max(200).optional().default(''),
  phase: z.string().optional().default(''),
  trial_type: z.string().optional().default(''),
  // Medical context
  therapeutic_area: z.string().min(1, 'Therapeutic area is required'),
  indication: z.string().max(300).optional().default(''),
  patient_population: z.string().max(300).optional().default(''),
  device_or_drug: z.string().optional().default(''),
  severity: z.string().optional().default(''),
  countries: z.array(z.string()).default([]),
  // Communication
  communication_goals: z.array(z.string()).default([]),
  target_audience: z.array(z.string()).default([]),
  is_patient_facing: z.boolean().default(false),
  // Brand direction
  brand_direction: z.array(z.string()).min(1, 'Select at least one brand direction').max(4).default([]),
  visual_preference: z.string().min(1, 'Visual preference is required'),
  preferred_colors: z.array(z.string()).max(6).default([]),
  keywords: z.array(z.string()).max(10).default([]),
  tagline: z.string().max(200).optional().default(''),
});

export type BrandBriefFormValues = z.infer<typeof brandBriefSchema>;

export const DEFAULT_BRAND_BRIEF: BrandBriefFormValues = {
  study_name: '',
  protocol_number: '',
  sponsor: '',
  cro: '',
  phase: '',
  trial_type: '',
  therapeutic_area: '',
  indication: '',
  patient_population: '',
  device_or_drug: '',
  severity: '',
  countries: [],
  communication_goals: [],
  target_audience: [],
  is_patient_facing: false,
  brand_direction: [],
  visual_preference: '',
  preferred_colors: [],
  keywords: [],
  tagline: '',
};

export function brandInputsToFormValues(inputs: BFBrandInputs): BrandBriefFormValues {
  return {
    study_name: inputs.study_name ?? inputs.brand_name ?? '',
    protocol_number: inputs.protocol_number ?? '',
    sponsor: inputs.sponsor ?? '',
    cro: inputs.cro ?? '',
    phase: inputs.phase ?? '',
    trial_type: inputs.trial_type ?? '',
    therapeutic_area: inputs.therapeutic_area ?? inputs.industry ?? '',
    indication: inputs.indication ?? '',
    patient_population: inputs.patient_population ?? '',
    device_or_drug: inputs.device_or_drug ?? '',
    severity: inputs.severity ?? '',
    countries: Array.isArray(inputs.countries) ? inputs.countries : [],
    communication_goals: Array.isArray(inputs.communication_goals) ? inputs.communication_goals : [],
    target_audience: Array.isArray(inputs.target_audience) ? inputs.target_audience : [],
    is_patient_facing: inputs.is_patient_facing ?? false,
    brand_direction: Array.isArray(inputs.brand_direction) ? inputs.brand_direction : [],
    visual_preference: inputs.visual_preference ?? inputs.icon_preference ?? '',
    preferred_colors: Array.isArray(inputs.preferred_colors) ? inputs.preferred_colors : [],
    keywords: Array.isArray(inputs.keywords) ? inputs.keywords : [],
    tagline: inputs.tagline ?? '',
  };
}

/** Display name for a project, preferring study_name over legacy brand_name */
export function getProjectDisplayName(inputs: BFBrandInputs): string {
  return inputs.study_name ?? inputs.brand_name ?? 'Untitled Study';
}
