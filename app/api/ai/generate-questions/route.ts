import { createClient } from '@/lib/server';
import { generateVisitReportQuestions } from '@/lib/ai/generate-visit-report-questions';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-REPLACE_WITH_YOUR_KEY') {
      return Response.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return Response.json({ error: 'No company context' }, { status: 400 });
    }

    const body = await request.json();

    if (!body.templateId) {
      return Response.json({ error: 'templateId is required' }, { status: 400 });
    }

    const studyDescription = typeof body.studyDescription === 'string' ? body.studyDescription.trim() : '';
    if (!studyDescription || studyDescription.length < 20) {
      return Response.json(
        { error: 'studyDescription is required (minimum 20 characters)' },
        { status: 400 }
      );
    }

    const result = await generateVisitReportQuestions(profile.company_id, {
      templateId: body.templateId,
      studyDescription,
      numQuestions: body.numQuestions,
      focusSections: body.focusSections,
      additionalContext: body.additionalContext,
    });

    return Response.json(result);
  } catch (err) {
    console.error('Generate questions error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to generate questions' },
      { status: 500 }
    );
  }
}
