import type { AgentConfig, ToolDefinition, UserContext } from '../types';
import { createClient } from '@/lib/server';

async function getProjectIdFromPage(ctx: UserContext): Promise<string | null> {
  const match = ctx.currentPage.match(/\/brand-forge\/([^/]+)/);
  return match?.[1] ?? null;
}

const tools: ToolDefinition[] = [
  {
    name: 'getProjectBrandInputs',
    description: 'Fetch the study intake data (brand inputs) for the current BrandForge project',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (optional, auto-detected from page)' },
      },
    },
    handler: async (args, ctx) => {
      const projectId = (args.projectId as string) || await getProjectIdFromPage(ctx);
      if (!projectId) return { error: 'No project ID available' };
      const supabase = await createClient();
      const { data } = await supabase
        .from('bf_brand_inputs')
        .select('*')
        .eq('project_id', projectId)
        .single();
      return data ?? { error: 'No inputs found' };
    },
  },
  {
    name: 'getBrandDirection',
    description: 'Fetch the AI-generated brand direction for the current project',
    parameters: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID (optional, auto-detected from page)' },
      },
    },
    handler: async (args, ctx) => {
      const projectId = (args.projectId as string) || await getProjectIdFromPage(ctx);
      if (!projectId) return { error: 'No project ID available' };
      const supabase = await createClient();
      const { data } = await supabase
        .from('bf_brand_directions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? { error: 'No brand direction found. Generate one from the Overview page first.' };
    },
  },
  {
    name: 'suggestColorPalette',
    description: 'Generate color palette suggestions based on therapeutic area, mood, and audience',
    parameters: {
      type: 'object',
      properties: {
        therapeuticArea: { type: 'string', description: 'e.g. Oncology, Cardiology' },
        mood: { type: 'string', description: 'e.g. compassionate, clinical, modern' },
        audience: { type: 'string', description: 'e.g. patients, investigators, sites' },
      },
      required: ['therapeuticArea'],
    },
    handler: async (args) => {
      const { generateObject } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');
      const { z } = await import('zod');

      const result = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
          palette: z.array(z.object({
            name: z.string(),
            hex: z.string(),
            usage: z.string(),
            rationale: z.string(),
          })).min(5).max(7),
        }),
        prompt: `Suggest a color palette for a ${args.therapeuticArea} clinical trial.
Mood: ${args.mood ?? 'professional'}. Audience: ${args.audience ?? 'general'}.
Provide 5-7 colors with name, hex, usage role, and rationale. Ensure good WCAG contrast.`,
      });
      return result.object;
    },
  },
  {
    name: 'suggestTypography',
    description: 'Recommend font pairings based on therapeutic area and tone',
    parameters: {
      type: 'object',
      properties: {
        therapeuticArea: { type: 'string' },
        tone: { type: 'string' },
      },
      required: ['therapeuticArea'],
    },
    handler: async (args) => {
      const { generateObject } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');
      const { z } = await import('zod');

      const result = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
          recommendations: z.array(z.object({
            heading: z.string(),
            body: z.string(),
            reasoning: z.string(),
          })).min(2).max(3),
        }),
        prompt: `Recommend 2-3 font pairings for a ${args.therapeuticArea} clinical trial with ${args.tone ?? 'professional'} tone. Include heading font, body font, and reasoning for each.`,
      });
      return result.object;
    },
  },
  {
    name: 'suggestTaglines',
    description: 'Generate study tagline options based on study context',
    parameters: {
      type: 'object',
      properties: {
        studyName: { type: 'string' },
        therapeuticArea: { type: 'string' },
        indication: { type: 'string' },
        audience: { type: 'string' },
      },
      required: ['studyName'],
    },
    handler: async (args) => {
      const { generateObject } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');
      const { z } = await import('zod');

      const result = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
          taglines: z.array(z.object({
            text: z.string(),
            tone: z.string(),
            audience: z.string(),
          })).min(4).max(6),
        }),
        prompt: `Generate 4-6 tagline options for a clinical study called "${args.studyName}" in ${args.therapeuticArea ?? 'healthcare'}, studying ${args.indication ?? 'a medical condition'}. Target audience: ${args.audience ?? 'patients and sites'}. Each tagline should be concise, compliant, and not overpromising. Provide tone and target audience for each.`,
      });
      return result.object;
    },
  },
  {
    name: 'reviewBrandCompliance',
    description: 'Review text for clinical trial branding compliance issues',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to review for compliance' },
      },
      required: ['text'],
    },
    handler: async (args) => {
      const { generateObject } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');
      const { z } = await import('zod');

      const result = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
          overallScore: z.enum(['pass', 'warning', 'fail']),
          issues: z.array(z.object({
            type: z.enum(['overpromising', 'misleading-efficacy', 'inappropriate-patient-claims', 'promotional-language', 'insensitive-language']),
            text: z.string().describe('The problematic text'),
            explanation: z.string(),
            suggestion: z.string().describe('Compliant alternative'),
          })),
          summary: z.string(),
        }),
        system: 'You are a clinical trial compliance reviewer. Check text for issues that would be inappropriate in clinical trial branding materials. Flag overpromising, misleading efficacy claims, inappropriate patient claims, promotional language, and insensitive language. Provide specific, actionable suggestions.',
        prompt: `Review the following text for clinical trial branding compliance:\n\n"${args.text}"`,
      });
      return result.object;
    },
  },
];

export const brandforgeStrategistAgent: AgentConfig = {
  id: 'brandforge-strategist',
  name: 'BrandForge Strategist',
  description: 'Clinical trial brand strategist that helps create professional, compliant, study-specific visual identities.',
  moduleContext: ['/protected/brand-forge'],
  systemPrompt: `You are BrandForge, the Clinical Brand Strategist.

## Core Role
You are an AI brand strategist built specifically for clinical trials, research programs, and study communications. You help sponsors, CROs, and study teams create professional, trustworthy, patient-aware brand kits that feel polished, compliant, and appropriate for the clinical research environment.

## Personality
You are calm, polished, professional, creative within boundaries, thoughtful, structured, trustworthy, patient-aware, and detail-oriented. You sound like a mix of brand strategist, clinical communications specialist, and design consultant.

## What You Do
- Define the mood and style of a clinical study brand
- Suggest color palettes and typography appropriate for the therapeutic area
- Generate study-specific tagline options
- Tailor messaging for patients, sites, investigators, and internal teams
- Review branding for compliance (no overpromising, misleading efficacy, or promotional language)
- Produce consistent visual guidance for recruitment and study materials

## What Makes You Different
You understand that clinical trial branding is not startup branding. Study branding must balance:
- Professionalism and scientific credibility
- Trust and empathy
- Clarity and accessibility
- Audience appropriateness

## Communication Style
- Clear and easy to understand
- Strategic, not overly technical
- Supportive and collaborative
- Visually aware
- Sensitive to patient-facing contexts
- Explain reasoning (why a palette fits cardiology vs oncology, why certain typography feels more credible)

## Expertise
- Protocol identity systems
- Patient recruitment visual strategy
- Investigator and site communication styles
- Therapeutic-area-aware design direction
- Compliance-aware content guidance

## Rules
- Ask thoughtful questions before generating recommendations
- Tailor suggestions to therapeutic area and audience
- Keep visuals professional and compliant-looking
- Give multiple options (conservative, balanced, bold)
- NEVER make regulatory or legal claims
- NEVER generate misleading or promotional patient language
- NEVER suggest branding that trivializes serious medical conditions
- NEVER assume all audiences need the same tone or visuals`,
  tools,
};
