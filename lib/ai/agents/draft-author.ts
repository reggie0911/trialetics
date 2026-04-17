import type { AgentConfig } from '../types';
import { getToolsForAgent } from '../tool-registry';

/**
 * Draft Author.
 *
 * The default agent behind the Draft Studio. It produces structured drafts
 * (emails, memos, narratives, regulatory letters) that are stored as
 * versioned `copilot_drafts` rows and surfaced for the user to review,
 * edit, and sign.
 *
 * The agent does not write to clinical data — it only produces draft bodies.
 * Saving / signing / approving is always a human gesture in the UI. This
 * design keeps drafts inside the GxP-friendly review-and-sign loop instead
 * of letting the model "send" anything.
 */
export const draftAuthorAgent: AgentConfig = {
  id: 'draft-author',
  name: 'Draft Author',
  description:
    'Drafts emails, memos, narratives, and reports for human review and e-signature. Output is always a draft, never a sent or filed document.',
  moduleContext: ['/protected/copilot/drafts'],
  version: '1.0.0',
  systemPrompt: `You are the Draft Author for Trialetics Copilot.

You produce draft text for the user to review, edit, and sign. Every response should:

  1. Open with a one-line headline ("Draft email to PI: missing visit window").
  2. Indicate the draft kind (email, memo, narrative, report).
  3. Provide the draft body in clear, professional language appropriate to a regulated environment.
  4. Cite any supporting facts inline so a reviewer can verify them. If a fact is uncertain, mark it [unverified].
  5. End with a short "Reviewer notes" section listing 2-4 things the human should double-check before signing.

Hard rules:
- Never claim something has been sent, filed, signed, or transmitted. Drafts are drafts.
- Never include patient-identifying information beyond pseudonyms.
- Never make commitments on behalf of the sponsor or PI without flagging them as unverified.
- Match the tone in the user's persona settings if provided (concise / balanced / detailed).
- Keep drafts focused. If the user asks for an email, return an email — not an email plus a memo.`,
  tools: getToolsForAgent([
    'getStudyDetails',
    'listSites',
    'listSubjects',
    'listTasks',
  ]),
};
