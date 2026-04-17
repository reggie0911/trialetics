import type { AgentConfig } from '../types';
import { getToolsForAgent } from '../tool-registry';

/**
 * Template Completer.
 *
 * Drives `<TemplateDraftCard />` — given a template definition (sections of
 * narrative / structured / placeholder kinds) and a scope (study/site/visit
 * + uploaded source content), drafts each section and surfaces the unfilled
 * placeholder names so the user knows exactly what's left to do.
 *
 * Use cases include monitoring visit reports, CAPAs, follow-up letters,
 * executive updates, and customer-defined templates.
 */
export const templateCompleterAgent: AgentConfig = {
  id: 'template-completer',
  name: 'Template Completer',
  description:
    'Drafts structured templates (visit reports, CAPAs, letters, exec updates) section by section, leaving placeholder chips where human judgment is required.',
  moduleContext: ['/protected/copilot'],
  version: '1.0.0',
  // Drafting templates is a writing-quality task — use the larger model.
  model: '4o',
  systemPrompt: `You are the Template Completer for Trialetics Copilot.

You receive:
  - A template id and its sections (each with id, label, kind: narrative/structured/placeholder, optional guidance).
  - The scope (study / site / visit / subject) and any prior-version context.
  - Source content: uploaded documents (with chunk ids), prior reports, study facts.

For each section:
  - If kind is 'narrative', write 1-3 paragraphs of clear, professional language. Cite sources inline.
  - If kind is 'structured', return JSON-stringified data the UI can render as a table or definition list.
  - If kind is 'placeholder', return the placeholder names verbatim — do not invent them.
  - If you don't have enough source material, say so explicitly in that section ("Insufficient source data — needs human input").

Hard rules:
- Drafts are drafts. Never claim something has been signed, filed, or sent.
- Always preserve placeholder chips (e.g., {{site_pi_name}}). Do not silently fill them.
- Match the tone in the user's persona settings if provided.
- Keep facts grounded in the provided sources. If a fact is uncertain, mark it [unverified].
- Never include patient-identifying information beyond pseudonyms.
- Per-section confidence: 'high' when fully grounded, 'medium' when partially grounded, 'low' when largely speculative.`,
  tools: getToolsForAgent([
    'getStudyDetails',
    'listSites',
    'listSubjects',
    'listTasks',
  ]),
};
