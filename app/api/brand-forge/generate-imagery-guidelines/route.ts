import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

import { createClient } from '@/lib/server';
import type { BFBrandInputs } from '@/lib/types/brand-forge';

export const runtime = 'nodejs';
export const maxDuration = 60;

const imageryGuidelinesSchema = z.object({
  guidelines: z
    .string()
    .min(1)
    .max(8000)
    .describe('Practical imagery guidelines for clinical trial study materials; plain text, bullets or short paragraphs'),
});

function buildStudyContextPrompt(inputs: BFBrandInputs): string {
  const lines: string[] = [];
  const studyName = inputs.study_name?.trim() || inputs.brand_name?.trim();
  if (studyName) lines.push(`Study name: ${studyName}`);
  if (inputs.protocol_number?.trim()) lines.push(`Protocol: ${inputs.protocol_number.trim()}`);
  if (inputs.sponsor?.trim()) lines.push(`Sponsor: ${inputs.sponsor.trim()}`);
  if (inputs.cro?.trim()) lines.push(`CRO: ${inputs.cro.trim()}`);
  if (inputs.phase?.trim()) lines.push(`Phase: ${inputs.phase.trim()}`);
  if (inputs.trial_type?.trim()) lines.push(`Trial type: ${inputs.trial_type.trim()}`);
  if (inputs.therapeutic_area?.trim()) lines.push(`Therapeutic area: ${inputs.therapeutic_area.trim()}`);
  if (inputs.indication?.trim()) lines.push(`Indication: ${inputs.indication.trim()}`);
  if (inputs.patient_population?.trim()) lines.push(`Patient population: ${inputs.patient_population.trim()}`);
  if (inputs.device_or_drug?.trim()) lines.push(`Investigational product context: ${inputs.device_or_drug.trim()}`);
  if (inputs.severity?.trim()) lines.push(`Severity: ${inputs.severity.trim()}`);
  const countries = Array.isArray(inputs.countries) ? inputs.countries.filter(Boolean) : [];
  if (countries.length) lines.push(`Countries: ${countries.join(', ')}`);
  lines.push(`Patient-facing materials: ${inputs.is_patient_facing ? 'yes' : 'no'}`);
  const goals = Array.isArray(inputs.communication_goals) ? inputs.communication_goals.filter(Boolean) : [];
  if (goals.length) lines.push(`Communication goals: ${goals.join('; ')}`);
  const audiences = Array.isArray(inputs.target_audience) ? inputs.target_audience.filter(Boolean) : [];
  if (audiences.length) lines.push(`Target audiences: ${audiences.join('; ')}`);
  return lines.join('\n');
}

function buildDirectionContext(direction: Record<string, unknown> | null): string {
  if (!direction) {
    return 'No saved AI brand direction yet for this study. Rely only on the study brief above for imagery guidance.';
  }
  const parts: string[] = [];
  if (typeof direction.mood === 'string' && direction.mood.trim()) {
    parts.push(`Overall mood: ${direction.mood.trim()}`);
  }
  if (typeof direction.visual_direction === 'string' && direction.visual_direction.trim()) {
    parts.push(`Visual approach: ${direction.visual_direction.trim()}`);
  }
  if (typeof direction.icon_style === 'string' && direction.icon_style.trim()) {
    parts.push(`Icon style: ${direction.icon_style.trim()}`);
  }
  if (typeof direction.imagery_direction === 'string' && direction.imagery_direction.trim()) {
    parts.push(`Imagery direction: ${direction.imagery_direction.trim()}`);
  }
  if (Array.isArray(direction.color_palette) && direction.color_palette.length > 0) {
    parts.push(`Suggested palette (for consistency, not literal photo colors): ${JSON.stringify(direction.color_palette)}`);
  }
  if (parts.length === 0) {
    return 'Brand direction record exists but imagery-related fields are empty; rely primarily on the study brief.';
  }
  return parts.join('\n');
}

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
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json().catch(() => ({}))) as {
      projectId?: string;
      focus?: string;
    };
    const { projectId, focus } = body;
    if (!projectId) return Response.json({ error: 'projectId required' }, { status: 400 });

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

    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const { data: inputsRow } = await supabase
      .from('bf_brand_inputs')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (!inputsRow) return Response.json({ error: 'No brand inputs found' }, { status: 404 });

    const inputs = inputsRow as unknown as BFBrandInputs;

    const { data: direction } = await supabase
      .from('bf_brand_directions')
      .select('mood, visual_direction, icon_style, imagery_direction, color_palette')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const studyBlock = buildStudyContextPrompt(inputs);
    const directionBlock = buildDirectionContext(direction as Record<string, unknown> | null);
    const focusBlock =
      typeof focus === 'string' && focus.trim().length > 0
        ? `\n\nUser emphasis for this generation (prioritize if compatible with compliance): ${focus.trim()}`
        : '';

    const result = await generateObject({
      model: openai('gpt-4o'),
      schema: imageryGuidelinesSchema,
      system: `You are a clinical trial creative director specializing in imagery for study materials (decks, brochures, ads, site-facing documents, and patient-facing assets when applicable).

Rules:
- Ground every recommendation in the study brief; stay medically appropriate and ethically sound.
- Emphasize inclusive, authentic representation; avoid stereotyping patient populations.
- Do not suggest imagery that implies guaranteed efficacy, cures, or misleading outcomes.
- For patient-facing work, prioritize warmth, clarity, dignity, and readability; avoid fear-based or stigmatizing visuals.
- Reference photography vs illustration, setting (clinical vs lifestyle), diversity, age-appropriateness, and icon/photo coherence where relevant.
- Output must be practical for designers and researchers — concrete do's and don'ts, not generic marketing fluff.`,
      prompt: `Write additional imagery guidelines for creative production for this clinical study.

Study brief:
${studyBlock}

Brand direction context:
${directionBlock}${focusBlock}

Produce a single "guidelines" field: plain text, may use bullet lines or short sections. Max length 8000 characters.`,
    });

    return Response.json({ guidelines: result.object.guidelines });
  } catch (error: unknown) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
