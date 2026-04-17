import { z } from 'zod';

import { registerCopilotForm } from '../base';

/**
 * Generic custom-tracker entry registration. Custom trackers are
 * dynamic-schema (see `lib/copilot/form-bridge/dynamic-schema.ts`) — at
 * runtime we compile the tracker definition into a Zod schema and the
 * form-filler/table-mapper agents work against that compiled schema.
 *
 * This registration is the "fallback" entry the Fill-with-Copilot button
 * targets when the user is on a custom tracker page. The agent receives the
 * tracker id as `scope.id` and resolves the dynamic schema at request time.
 */
export const customTrackerEntryStubSchema = z.object({
  tracker_id: z.string().min(1),
  /** The actual entry payload — shape depends on the tracker. */
  values: z.record(z.string(), z.unknown()),
});

registerCopilotForm({
  id: 'ctms.custom-tracker-entry',
  label: 'Custom tracker entry',
  description: 'Add or update a row in any custom tracker — schema is resolved per tracker at fill time.',
  scope: 'tracker',
  schema: customTrackerEntryStubSchema,
  defaultAgentId: 'table-mapper',
  contextHint: 'Drop a spreadsheet that matches the tracker columns — the Copilot maps and proposes rows.',
});
