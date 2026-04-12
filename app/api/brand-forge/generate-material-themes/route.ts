import { NextRequest } from 'next/server';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

import { createClient } from '@/lib/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const stylingGuide = z.object({
  background_color: z.string(),
  accent_color: z.string(),
  heading_font: z.string(),
  body_font: z.string(),
  layout_notes: z.string(),
  tone: z.string(),
});

const materialThemesSchema = z.object({
  siv_deck_styling: stylingGuide.describe('Site Initiation Visit deck styling'),
  monitoring_visit_styling: stylingGuide.describe('Monitoring visit presentation styling'),
  newsletter_styling: stylingGuide.describe('Newsletter and updates template styling'),
  training_manual_styling: stylingGuide.describe('Training manual visual consistency'),
  powerpoint_theme: stylingGuide.describe('PowerPoint theme guidance'),
  pdf_styling: stylingGuide.describe('PDF document styling rules'),
  one_pager_layout: stylingGuide.describe('Study one-pager layout principles'),
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
      schema: materialThemesSchema,
      system: 'You are a clinical trial materials design consultant. Generate styling guides for clinical trial documents that maintain brand consistency, professionalism, and regulatory appropriateness across all document types.',
      prompt: `Generate styling guides for all trial materials for:
Study: ${inputs.study_name || inputs.brand_name}
Therapeutic Area: ${inputs.therapeutic_area || 'N/A'}
Phase: ${inputs.phase || 'N/A'}
Brand Direction: ${(inputs.brand_direction as string[])?.join(', ') || 'N/A'}
Visual Preference: ${inputs.visual_preference || 'N/A'}
${direction ? `Mood: ${direction.mood}` : ''}
${direction?.color_palette ? `Palette: ${JSON.stringify(direction.color_palette)}` : ''}
${direction?.typography_recommendations ? `Typography: ${JSON.stringify(direction.typography_recommendations)}` : ''}`,
    });

    const { data: inserted, error: insertError } = await supabase
      .from('bf_material_themes')
      .insert({ project_id: projectId, ...result.object })
      .select()
      .single();

    if (insertError) return Response.json({ error: insertError.message }, { status: 500 });
    return Response.json(inserted);
  } catch (error: unknown) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
