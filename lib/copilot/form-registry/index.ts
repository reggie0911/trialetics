import { describeSchema, listRequiredPaths } from '@/lib/copilot/form-bridge/schema-introspector';
import type { FieldDescriptor } from '@/lib/copilot/form-bridge/schema-introspector';

export type { FormScope, FormFieldHints, CopilotFormRegistration } from './base';
export { registerCopilotForm, getCopilotForm, listCopilotForms, REGISTRY } from './base';

import { REGISTRY } from './base'; // used by getFormDescriptor below

/** Walk the registered schema and return its descriptor tree. */
export function getFormDescriptor(id: string): FieldDescriptor | undefined {
  const registration = REGISTRY.get(id);
  if (!registration) return undefined;
  return describeSchema(registration.schema);
}

export function getRequiredPaths(id: string): string[] {
  const descriptor = getFormDescriptor(id);
  if (!descriptor) return [];
  return listRequiredPaths(descriptor);
}

/**
 * Eagerly load the seed registrations so anything importing the registry
 * sees the built-in forms without a separate bootstrap step.
 */
import './schemas/site-activation';
import './schemas/study-overview';
import './schemas/monitoring-visit';
import './schemas/capa';
import './schemas/deviation';
import './schemas/tmf-metadata';
import './schemas/custom-tracker';
import './schemas/subject';
import './schemas/visit-schedule';
