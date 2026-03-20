import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { createClient } from '@/lib/server';
import { normalizeReportOrderBySection } from '@/lib/utils/normalize-report-order-by-section';

export interface GenerateVisitReportQuestionsInput {
  templateId: string;
  studyDescription: string;
  numQuestions?: number;
  focusSections?: string[];
  additionalContext?: string;
}

export interface GeneratedVisitReportQuestion {
  question_text: string;
  report_order: number;
  report_sub_section: string;
}

const VISIT_TYPE_GUIDANCE: Record<string, string> = {
  sqv: `Site Qualification Visit (SQV) focus areas:
- Facility assessment (space, equipment, storage, pharmacy, lab)
- Staff qualifications and experience with clinical research
- Regulatory readiness (IRB/EC relationships, approval timelines)
- Subject recruitment potential and patient population
- Existing workload and competing studies
- Standard of care practices relevant to the protocol
- Data management capabilities and systems
- Safety reporting infrastructure`,

  siv: `Site Initiation Visit (SIV) focus areas:
- Protocol training and understanding verification
- Informed consent process review
- Study drug/device handling and storage procedures
- Randomization and unblinding procedures
- Case Report Form (CRF/eCRF) completion training
- Source document identification and requirements
- Safety reporting procedures (AE/SAE timelines and processes)
- Laboratory procedures and sample handling
- Regulatory document status (IRB approval, financial disclosures, CVs)
- Site file setup and essential document review
- Communication plan and contact information
- Subject enrollment procedures and eligibility criteria review`,

  monitoring: `Routine Monitoring Visit focus areas:
- Source Data Verification (SDV) and Source Data Review (SDR)
- Informed consent review (new subjects, re-consent, amendments)
- Protocol compliance and deviation review
- Investigational product accountability and storage
- Safety reporting review (AE/SAE reporting timeliness and accuracy)
- Regulatory document maintenance and updates
- Subject enrollment and retention status
- CRF/eCRF data entry review and query resolution
- Laboratory and sample management review
- Site file review and essential document updates
- Facility and equipment status
- Staff changes and training updates
- Financial reconciliation and payment status
- Corrective action follow-up from previous visits`,

  close_out: `Site Close-Out Visit focus areas:
- Final source data verification and query resolution
- Investigational product reconciliation and return/destruction
- Final regulatory document collection
- Study file reconciliation and archival preparation
- Retention requirements communication
- Outstanding payment reconciliation
- Final safety reporting review
- Subject status reconciliation (completed, withdrawn, lost to follow-up)
- Data lock readiness and final data review
- Post-study treatment and follow-up arrangements
- Equipment return or decommissioning
- Acknowledgment of site obligations after study closure`,
};

export async function generateVisitReportQuestions(
  companyId: string,
  input: GenerateVisitReportQuestionsInput
): Promise<{
  questions: GeneratedVisitReportQuestion[];
  templateName: string;
  visitType: string;
}> {
  const supabase = await createClient();

  const { data: template, error: templateError } = await supabase
    .from('visit_report_templates')
    .select('id, name, visit_report_type, study_id')
    .eq('id', input.templateId)
    .eq('company_id', companyId)
    .single();

  if (templateError || !template) {
    throw new Error('Template not found');
  }

  const { data: existingQuestions } = await supabase
    .from('visit_report_template_questions')
    .select('question_text, report_sub_section, report_order')
    .eq('template_id', input.templateId);

  const existingText = (existingQuestions || [])
    .map((d) => `[${d.report_sub_section || 'GENERAL'}] ${d.question_text}`)
    .join('\n');

  const maxExistingOrder = (existingQuestions || []).reduce(
    (max, d) => Math.max(max, d.report_order ?? 0),
    0
  );

  const visitGuidance =
    VISIT_TYPE_GUIDANCE[template.visit_report_type] || VISIT_TYPE_GUIDANCE.monitoring;
  const numQuestions = input.numQuestions ?? 10;

  const hasFocusSections = input.focusSections && input.focusSections.length > 0;
  const focusInstruction = hasFocusSections
    ? `\nYou MUST use ONLY these exact sub-section names for the "report_sub_section" field: ${input.focusSections!.join(', ')}. Do NOT invent other sub-section names. Distribute the questions across these sub-sections.`
    : '';

  const additionalInstruction = input.additionalContext
    ? `\nAdditional user instructions: ${input.additionalContext}`
    : '';

  const existingNote = existingText
    ? `\n\nExisting questions already in this template (do NOT duplicate these):\n${existingText}`
    : '';

  const studyContext = `\n\nSTUDY CONTEXT (REQUIRED - use this to tailor questions to the specific study):\n${input.studyDescription.trim()}\n`;

  const prompt = `You are a clinical research monitoring expert. Generate ${numQuestions} checklist questions for a "${template.name}" visit report template (visit type: ${template.visit_report_type}).

${studyContext}
${visitGuidance}
${focusInstruction}
${additionalInstruction}
${existingNote}

Generate exactly ${numQuestions} questions. Each question must be tailored to the study description above—do NOT generate generic or random questions. Each question should:
- Be actionable and specific (start with a verb like "Verify", "Review", "Confirm", "Check", "Assess")
- Reference or relate to the study context (therapeutic area, phase, procedures, etc.) when relevant
- Follow ICH-GCP guidelines and industry best practices
${hasFocusSections ? '- Use ONLY the specified sub-section names for report_sub_section' : '- Be grouped into logical sub-sections (e.g. REGULATORY, SAFETY, ENROLLMENT, SOURCE DATA, IP ACCOUNTABILITY, FINANCE, TRAINING, FACILITY, INFORMED CONSENT, DATA MANAGEMENT)'}

Respond with a JSON object containing a "questions" key with an array of objects, each with:
- "question_text": the question text
- "report_order": sequential number starting from 1
- "report_sub_section": the sub-section category in UPPERCASE

Example format: {"questions": [{"question_text": "Verify...", "report_order": 1, "report_sub_section": "REGULATORY"}]}`;

  const { object: parsed } = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      questions: z.array(
        z.object({
          question_text: z.string(),
          report_order: z.number(),
          report_sub_section: z.string(),
        })
      ),
    }),
    prompt,
    temperature: 0.7,
  });

  const baseQuestions = parsed.questions.map((q) => ({
    question_text: q.question_text,
    report_sub_section: q.report_sub_section || 'GENERAL',
    report_order: 0,
  }));
  const questions: GeneratedVisitReportQuestion[] = normalizeReportOrderBySection(
    baseQuestions,
    maxExistingOrder + 1
  ) as GeneratedVisitReportQuestion[];

  return {
    questions,
    templateName: template.name,
    visitType: template.visit_report_type,
  };
}
