import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { createClient } from '@/lib/server';

interface GenerateQuestionsInput {
  templateId: string;
  numQuestions?: number;
  focusSections?: string[];
  additionalContext?: string;
}

export interface GeneratedQuestion {
  activity: string;
  report_order: number;
  report_sub_section: string;
}

const VISIT_TYPE_GUIDANCE: Record<string, string> = {
  evaluation: `Site Evaluation / Qualification Visit focus areas:
- Facility assessment (space, equipment, storage, pharmacy, lab)
- Staff qualifications and experience with clinical research
- Regulatory readiness (IRB/EC relationships, approval timelines)
- Subject recruitment potential and patient population
- Existing workload and competing studies
- Standard of care practices relevant to the protocol
- Data management capabilities and systems
- Safety reporting infrastructure`,

  initiation: `Site Initiation Visit (SIV) focus areas:
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

  unscheduled: `Unscheduled / For-Cause Visit focus areas:
- Specific issue investigation and root cause analysis
- Protocol deviation assessment and corrective actions
- Safety concern evaluation
- Regulatory compliance assessment
- Staff retraining needs assessment
- Corrective and preventive action (CAPA) planning
- Documentation review related to the triggering event
- Subject safety and data integrity assessment`,
};

export async function generateQuestionsForTemplate(
  companyId: string,
  input: GenerateQuestionsInput
): Promise<{ questions: GeneratedQuestion[]; templateName: string; visitType: string }> {
  const supabase = await createClient();

  const { data: template, error: templateError } = await supabase
    .from('trip_report_templates')
    .select('id, name, visit_type, protocol_id')
    .eq('id', input.templateId)
    .eq('company_id', companyId)
    .single();

  if (templateError || !template) {
    throw new Error('Template not found');
  }

  const { data: existingDetails } = await supabase
    .from('trip_report_template_details')
    .select('activity, report_sub_section')
    .eq('template_id', input.templateId);

  const existingQuestions = (existingDetails || [])
    .map(d => `[${d.report_sub_section || 'GENERAL'}] ${d.activity}`)
    .join('\n');

  const visitGuidance = VISIT_TYPE_GUIDANCE[template.visit_type] || VISIT_TYPE_GUIDANCE.monitoring;
  const numQuestions = input.numQuestions || 10;

  let protocolContext = '';
  if (template.protocol_id) {
    const { data: protocol } = await supabase
      .from('clinical_protocols')
      .select('name, phase, therapeutic_area, indication')
      .eq('id', template.protocol_id)
      .single();
    if (protocol) {
      const parts = [
        protocol.name && `Study: ${protocol.name}`,
        protocol.phase && `Phase: ${protocol.phase}`,
        protocol.therapeutic_area && `Therapeutic area: ${protocol.therapeutic_area}`,
        protocol.indication && `Indication: ${protocol.indication}`,
      ].filter(Boolean);
      if (parts.length > 0) {
        protocolContext = `\n\nProtocol context:\n${parts.join('\n')}`;
      }
    }
  }

  const hasFocusSections = input.focusSections && input.focusSections.length > 0;
  const focusInstruction = hasFocusSections
    ? `\nYou MUST use ONLY these exact sub-section names for the "report_sub_section" field: ${input.focusSections!.join(', ')}. Do NOT invent other sub-section names. Distribute the questions across these sub-sections.`
    : '';

  const additionalInstruction = input.additionalContext
    ? `\nAdditional user instructions: ${input.additionalContext}`
    : '';

  const existingNote = existingQuestions
    ? `\n\nExisting questions already in this template (do NOT duplicate these):\n${existingQuestions}`
    : '';

  const prompt = `You are a clinical research monitoring expert. Generate ${numQuestions} checklist questions for a "${template.name}" trip report template (visit type: ${template.visit_type}).

${visitGuidance}
${protocolContext}
${focusInstruction}
${additionalInstruction}
${existingNote}

Generate exactly ${numQuestions} questions. Each question should:
- Be actionable and specific (start with a verb like "Verify", "Review", "Confirm", "Check", "Assess")
- Follow ICH-GCP guidelines and industry best practices
${hasFocusSections ? '- Use ONLY the specified sub-section names for report_sub_section' : '- Be grouped into logical sub-sections (e.g. REGULATORY, SAFETY, ENROLLMENT, SOURCE DATA, IP ACCOUNTABILITY, FINANCE, TRAINING, FACILITY, INFORMED CONSENT, DATA MANAGEMENT)'}

Respond with a JSON object containing a "questions" key with an array of objects, each with:
- "activity": the question text
- "report_order": sequential number starting from 1
- "report_sub_section": the sub-section category in UPPERCASE

Example format: {"questions": [{"activity": "Verify...", "report_order": 1, "report_sub_section": "REGULATORY"}]}`;

  const { object: parsed } = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      questions: z.array(
        z.object({
          activity: z.string(),
          report_order: z.number(),
          report_sub_section: z.string(),
        })
      ),
    }),
    prompt,
    temperature: 0.7,
  });

  const questions: GeneratedQuestion[] = parsed.questions;

  const maxExistingOrder = (existingDetails || []).reduce((max, d) => {
    const row = d as { report_order?: number | null };
    return Math.max(max, row.report_order ?? 0);
  }, 0);

  const offsetQuestions = questions.map((q, i) => ({
    activity: q.activity,
    report_order: maxExistingOrder + (q.report_order || i + 1),
    report_sub_section: q.report_sub_section || 'GENERAL',
  }));

  return {
    questions: offsetQuestions,
    templateName: template.name,
    visitType: template.visit_type,
  };
}
