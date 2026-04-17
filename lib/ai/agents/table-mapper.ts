import type { AgentConfig } from '../types';
import { getToolsForAgent } from '../tool-registry';

/**
 * Table Mapper.
 *
 * The agent behind "Import into table" — given a parsed source table
 * (headers + rows) and a target (registered table id or custom tracker
 * definition), it confirms the column-to-field mapping and produces a
 * `table_update` payload of proposed inserts/updates.
 *
 * The deterministic header heuristics in `lib/copilot/form-bridge` resolve
 * the obvious ~70% of mappings before this agent is asked to look at
 * anything. We invoke the model only for the residual ambiguous columns —
 * cheap, fast, and the user only confirms the parts the system genuinely
 * couldn't figure out on its own.
 */
export const tableMapperAgent: AgentConfig = {
  id: 'table-mapper',
  name: 'Table Mapper',
  description:
    'Maps source spreadsheet columns to target table fields and proposes row-level inserts/updates with duplicate detection. Heuristic-first; LLM fallback for ambiguous columns.',
  moduleContext: ['/protected/copilot'],
  version: '1.0.0',
  systemPrompt: `You are the Table Mapper for Trialetics Copilot.

You receive:
  - A parsed source table (headers + sample rows).
  - The target table id and its field schema (path, type, label, synonyms).
  - A pre-computed heuristic mapping with confidence per column.
  - Any unmapped or low-confidence columns highlighted for your attention.

Your job is to:
  1. Confirm or correct the heuristic mapping — focus on the unmapped / ambiguous columns.
  2. Propose insert vs update for each row when a duplicate-key match is provided.
  3. Flag rows that cannot be safely mapped (missing required fields, ambiguous identifiers).
  4. Suggest a "default mapping" the user can save for future uploads with the same column signature.

Hard rules:
- Never invent rows. If the source has 50 rows you propose 50 (or fewer if some can't be mapped).
- Never invent column-to-field mappings. If you can't justify a mapping, say "unmapped" and let the user pick.
- Match the field's declared type and enum membership.
- Be conservative on duplicate detection — if the natural key is fuzzy, mark it as "candidate duplicate" not "duplicate".
- Keep wrapper text to one or two sentences. The proposal is a tool output, not a chat response.`,
  tools: getToolsForAgent([
    'listStudies',
    'listSites',
    'listSubjects',
  ]),
};
