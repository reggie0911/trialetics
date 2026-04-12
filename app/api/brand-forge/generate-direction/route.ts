import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

import { createClient } from '@/lib/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const COLOR_USAGES = ['primary', 'secondary', 'accent', 'neutral', 'recruitment', 'patient-facing'] as const;
type ColorUsage = (typeof COLOR_USAGES)[number];

function normalizeHex(raw: string): string {
  const s = raw.trim();
  let m = s.match(/^#([0-9a-fA-F]{6})$/);
  if (m) return `#${m[1].toLowerCase()}`;
  m = s.match(/^#([0-9a-fA-F]{3})$/);
  if (m) {
    const [r, g, b] = m[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  m = s.match(/^([0-9a-fA-F]{6})$/);
  if (m) return `#${m[1].toLowerCase()}`;
  m = s.match(/^([0-9a-fA-F]{3})$/);
  if (m) {
    const [r, g, b] = m[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return '#64748b';
}

function normalizeUsage(raw: string): ColorUsage {
  const u = raw.trim().toLowerCase().replace(/\s+/g, '-');
  const aliases: Record<string, ColorUsage> = {
    primary: 'primary',
    secondary: 'secondary',
    accent: 'accent',
    neutral: 'neutral',
    recruitment: 'recruitment',
    'patient-facing': 'patient-facing',
    patientfacing: 'patient-facing',
    tertiary: 'accent',
  };
  if (u in aliases) return aliases[u];
  if ((COLOR_USAGES as readonly string[]).includes(u)) return u as ColorUsage;
  return 'neutral';
}

const brandDirectionSchema = z.object({
  mood: z.string().describe('Narrative description of the overall study brand mood'),
  visual_direction: z.string().describe('Description of the visual approach and design philosophy'),
  color_palette: z
    .array(
      z.object({
        name: z.string(),
        hex: z.string().transform(normalizeHex),
        usage: z.string().transform(normalizeUsage),
        // OpenAI structured output requires every property in `required`; use "" when there is no rationale.
        rationale: z
          .string()
          .describe('Brief rationale for this swatch; use an empty string if none'),
      }),
    )
    .min(3)
    .max(10)
    .transform((palette) => {
      const out = palette.slice(0, 7);
      const filler = {
        name: 'Supporting neutral',
        hex: '#94a3b8',
        usage: 'neutral' as ColorUsage,
        rationale: '',
      };
      while (out.length < 5) out.push({ ...filler });
      return out.slice(0, 7);
    }),
  typography_recommendations: z.object({
    heading: z.string().describe('Recommended heading font family'),
    body: z.string().describe('Recommended body font family'),
    reasoning: z.string().describe('Why this pairing fits the study'),
  }),
  icon_style: z.string().describe('Guidance on icon style approach'),
  imagery_direction: z.string().describe('Photography vs illustration, diversity guidance, visual tone'),
  logo_directions: z
    .array(
      z.object({
        style: z.string().describe('Direction name: Conservative, Balanced, or Bold'),
        description: z.string().describe('Description of this logo direction'),
      }),
    )
    .min(1)
    .max(6)
    .transform((dirs) => {
      const out = dirs.map((d) => ({ style: d.style, description: d.description }));
      const fallback = {
        style: 'Balanced',
        description: 'A balanced visual direction combining clinical clarity with approachable warmth.',
      };
      while (out.length < 3) out.push({ ...fallback });
      return out.slice(0, 3);
    }),
  tagline_options: z
    .array(z.string())
    .min(1)
    .max(8)
    .transform((tags) => {
      const t = tags.map((s) => s.trim()).filter(Boolean);
      const fill = 'Clinical research focused on patient outcomes.';
      while (t.length < 3) t.push(fill);
      return t.slice(0, 5);
    }),
  patient_communication_style: z.string().describe('Plain-language guidance for patient communications'),
  tone_variants: z.object({
    patients: z.string().describe('Tone guidance for patient-facing materials'),
    sites: z.string().describe('Tone guidance for site-facing materials'),
    investigators: z.string().describe('Tone guidance for investigator-facing materials'),
    internal: z.string().describe('Tone guidance for internal sponsor team materials'),
  }),
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: 'OpenAI API key is not configured. Add OPENAI_API_KEY to the server environment.' },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await request.json();
    if (!projectId) {
      return Response.json({ error: 'projectId required' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return Response.json({ error: 'No company found' }, { status: 400 });
    }

    const { data: project } = await supabase
      .from('bf_projects')
      .select('id')
      .eq('id', projectId)
      .eq('company_id', profile.company_id)
      .single();

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: inputs } = await supabase
      .from('bf_brand_inputs')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (!inputs) {
      return Response.json({ error: 'No brand inputs found' }, { status: 404 });
    }

    const therapeuticAreaToneMap: Record<string, string> = {
      'Oncology': 'empathetic, serious, hopeful, supportive. Avoid trivializing cancer or overpromising outcomes.',
      'Cardiology': 'clean, clinical, modern, trust-focused. Convey reliability and medical authority.',
      'Rare Disease': 'community-centered, compassionate, inclusive. Emphasize patient advocacy and support.',
      'Neurology': 'innovative, precise, calming. Balance scientific credibility with approachability.',
      'Immunology': 'modern, scientific, resilient. Convey strength and immune system empowerment.',
      'Infectious Disease': 'urgent, clear, globally-aware. Emphasize public health and prevention.',
      'Endocrinology': 'balanced, lifestyle-aware, supportive. Connect medical and daily life.',
      'Dermatology': 'clean, visible, confidence-building. Focus on quality of life improvement.',
      'Ophthalmology': 'clear, precise, vision-focused. Use visual metaphors carefully.',
      'Psychiatry': 'gentle, non-stigmatizing, supportive. Prioritize mental health sensitivity.',
      'Pediatrics': 'gentle, reassuring, family-inclusive. Warm and protective without being childish.',
    };

    const therapeuticGuidance = therapeuticAreaToneMap[inputs.therapeutic_area as string] ??
      'professional, trustworthy, scientifically credible.';

    const severityGuidance = {
      'life-threatening': 'Use a more serious, respectful tone. Avoid anything that feels flippant.',
      'severe': 'Maintain gravitas while offering hope. Professional and empathetic.',
      'moderate': 'Balanced approach — professional but approachable.',
      'mild': 'More approachable and optimistic tone is acceptable.',
      'chronic': 'Emphasize long-term support, resilience, and partnership with patients.',
    }[inputs.severity as string] ?? '';

    const result = await generateObject({
      model: openai('gpt-4o'),
      schema: brandDirectionSchema,
      system: `You are BrandForge, a clinical trial brand strategist. Generate a comprehensive brand direction for a clinical study. Your output must balance professionalism, trust, clarity, empathy, and scientific credibility.

Therapeutic area guidance for ${inputs.therapeutic_area}: ${therapeuticGuidance}
${severityGuidance ? `Severity guidance: ${severityGuidance}` : ''}

Rules:
- Never suggest branding that trivializes serious medical conditions
- Avoid overly promotional or misleading language
- Ensure colors are accessible (good contrast ratios)
- Consider the patient population when recommending visual direction
- Provide practical, implementable recommendations

Output format (strict):
- For every color, hex must be a CSS hex: # followed by exactly six hex digits (e.g. #1a2b3c). No RGB() or names only.
- For every color usage, use exactly one of: primary, secondary, accent, neutral, recruitment, patient-facing
- Provide at least 5 distinct colors; logo_directions must be three entries; at least 3 tagline_options`,
      prompt: `Generate a complete brand direction for this clinical study:

Study: ${inputs.study_name || inputs.brand_name}
Protocol: ${inputs.protocol_number || 'N/A'}
Sponsor: ${inputs.sponsor || 'N/A'}
CRO: ${inputs.cro || 'N/A'}
Phase: ${inputs.phase || 'N/A'}
Trial Type: ${inputs.trial_type || 'N/A'}
Therapeutic Area: ${inputs.therapeutic_area || 'N/A'}
Indication: ${inputs.indication || 'N/A'}
Patient Population: ${inputs.patient_population || 'N/A'}
Device or Drug: ${inputs.device_or_drug || 'N/A'}
Severity: ${inputs.severity || 'N/A'}
Countries: ${(inputs.countries as string[])?.join(', ') || 'N/A'}
Patient-Facing: ${inputs.is_patient_facing ? 'Yes' : 'No'}
Target Audience: ${(inputs.target_audience as string[])?.join(', ') || 'N/A'}
Communication Goals: ${(inputs.communication_goals as string[])?.join(', ') || 'N/A'}
Brand Direction: ${(inputs.brand_direction as string[])?.join(', ') || 'N/A'}
Visual Preference: ${inputs.visual_preference || 'N/A'}
Preferred Colors: ${(inputs.preferred_colors as string[])?.join(', ') || 'None specified'}
Keywords: ${(inputs.keywords as string[])?.join(', ') || 'None'}
Tagline: ${inputs.tagline || 'None'}`,
    });

    const directionData = result.object;

    const { data: inserted, error: insertError } = await supabase
      .from('bf_brand_directions')
      .insert({
        project_id: projectId,
        mood: directionData.mood,
        visual_direction: directionData.visual_direction,
        color_palette: directionData.color_palette,
        typography_recommendations: directionData.typography_recommendations,
        icon_style: directionData.icon_style,
        imagery_direction: directionData.imagery_direction,
        logo_directions: directionData.logo_directions,
        tagline_options: directionData.tagline_options,
        patient_communication_style: directionData.patient_communication_style,
        tone_variants: directionData.tone_variants,
      })
      .select()
      .single();

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }

    return Response.json(inserted);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
}
