import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

import { createClient } from '@/lib/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const recruitmentKitSchema = z.object({
  campaign_palette: z.array(z.object({
    name: z.string(),
    hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    usage: z.enum(['primary', 'secondary', 'accent', 'neutral', 'recruitment', 'patient-facing']),
  })).min(3).max(6),
  headline_styles: z.array(z.object({
    template: z.string().describe('Headline template with placeholder'),
    tone: z.string().describe('Tone description for this headline style'),
  })).min(3).max(5),
  brochure_tone: z.string().describe('Overall visual and verbal tone for patient brochures'),
  social_ad_direction: z.string().describe('Creative direction for social media ads'),
  diversity_imagery_guidance: z.string().describe('Guidance for diversity-sensitive imagery'),
  cta_styles: z.array(z.object({
    label: z.string(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    urgency: z.enum(['low', 'medium', 'high']),
  })).min(2).max(4),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId } = await request.json();
    if (!projectId) return Response.json({ error: 'projectId required' }, { status: 400 });

    const { data: inputs } = await supabase.from('bf_brand_inputs').select('*').eq('project_id', projectId).single();
    if (!inputs) return Response.json({ error: 'No brand inputs found' }, { status: 404 });

    const { data: direction } = await supabase.from('bf_brand_directions').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).maybeSingle();

    const result = await generateObject({
      model: openai('gpt-4o'),
      schema: recruitmentKitSchema,
      system: 'You are a clinical trial recruitment marketing strategist. Generate recruitment creative direction that is compliant, patient-appropriate, and effective for clinical trial enrollment. Never overpromise outcomes. Be diversity-sensitive and culturally aware.',
      prompt: `Generate a recruitment creative kit for:
Study: ${inputs.study_name || inputs.brand_name}
Therapeutic Area: ${inputs.therapeutic_area || 'N/A'}
Indication: ${inputs.indication || 'N/A'}
Patient Population: ${inputs.patient_population || 'N/A'}
Severity: ${inputs.severity || 'N/A'}
Countries: ${(inputs.countries as string[])?.join(', ') || 'N/A'}
Patient-Facing: ${inputs.is_patient_facing ? 'Yes' : 'No'}
${direction ? `Brand Direction Mood: ${direction.mood}` : ''}
${direction?.color_palette ? `Base Palette: ${JSON.stringify(direction.color_palette)}` : ''}`,
    });

    const { data: inserted, error: insertError } = await supabase
      .from('bf_recruitment_kits')
      .insert({ project_id: projectId, ...result.object })
      .select()
      .single();

    if (insertError) return Response.json({ error: insertError.message }, { status: 500 });
    return Response.json(inserted);
  } catch (error: unknown) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
