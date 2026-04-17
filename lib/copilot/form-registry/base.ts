import { z } from 'zod';

/**
 * Core registry primitives — no schema-introspector or side-effect imports.
 * Schema files import from here to avoid a circular dependency with index.ts
 * (index.ts side-effect-imports the schemas; schemas register via this module).
 */

export type FormScope = 'global' | 'study' | 'site' | 'subject' | 'visit' | 'tracker';

export interface FormFieldHints {
  path: string;
  label?: string;
  synonyms?: string[];
}

export interface CopilotFormRegistration<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
  id: string;
  label: string;
  description?: string;
  scope: FormScope;
  schema: TSchema;
  hints?: FormFieldHints[];
  requiresESignature?: boolean;
  requiredRole?: string;
  defaultAgentId?: string;
  contextHint?: string;
}

export const REGISTRY = new Map<string, CopilotFormRegistration>();

export function registerCopilotForm<TSchema extends z.ZodTypeAny>(
  registration: CopilotFormRegistration<TSchema>
): CopilotFormRegistration<TSchema> {
  REGISTRY.set(registration.id, registration as unknown as CopilotFormRegistration);
  return registration;
}

export function getCopilotForm(id: string): CopilotFormRegistration | undefined {
  return REGISTRY.get(id);
}

export function listCopilotForms(): CopilotFormRegistration[] {
  return Array.from(REGISTRY.values());
}
