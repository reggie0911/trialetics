import { z } from 'zod';

import type { FieldDescriptor } from './schema-introspector';

/**
 * Custom-tracker support — runtime-defined schemas.
 *
 * Custom trackers across Trialetics are stored as JSON column definitions
 * (label, key, type, required, options). We compile that into a Zod schema
 * on the fly so the rest of the form-bridge pipeline (introspector,
 * field-mapper, validators) treats custom trackers exactly the same as
 * compile-time forms.
 */

export type DynamicFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'email'
  | 'url'
  | 'currency';

export interface DynamicFieldDefinition {
  key: string;
  label: string;
  type: DynamicFieldType;
  required?: boolean;
  options?: { value: string; label?: string }[];
  hints?: string[];
}

/** Build a `z.object(...)` schema from a runtime field list. */
export function compileDynamicSchema(fields: DynamicFieldDefinition[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};

  for (const field of fields) {
    let leaf: z.ZodTypeAny;
    switch (field.type) {
      case 'text':
      case 'textarea':
      case 'email':
      case 'url':
        leaf = z.string();
        break;
      case 'number':
      case 'currency':
        leaf = z.coerce.number();
        break;
      case 'date':
        leaf = z.string(); // ISO date strings — match the rest of the app.
        break;
      case 'boolean':
        leaf = z.boolean();
        break;
      case 'select': {
        const values = (field.options ?? []).map(o => o.value);
        leaf = values.length > 0 ? z.enum(values as [string, ...string[]]) : z.string();
        break;
      }
      case 'multi_select': {
        const values = (field.options ?? []).map(o => o.value);
        leaf = values.length > 0
          ? z.array(z.enum(values as [string, ...string[]]))
          : z.array(z.string());
        break;
      }
      default:
        leaf = z.unknown();
    }

    shape[field.key] = field.required ? leaf : leaf.optional();
  }

  return z.object(shape);
}

/**
 * Lift the runtime field list into the same descriptor list the static
 * introspector produces — lets the field-mapper consume both the same way.
 */
export function describeDynamicFields(fields: DynamicFieldDefinition[]): FieldDescriptor[] {
  return fields.map(field => ({
    path: field.key,
    label: field.label,
    hints: field.hints,
    required: !!field.required,
    kind:
      field.type === 'number' || field.type === 'currency'
        ? 'number'
        : field.type === 'boolean'
          ? 'boolean'
          : field.type === 'date'
            ? 'date'
            : field.type === 'select' || field.type === 'multi_select'
              ? 'enum'
              : 'string',
    enumValues:
      field.type === 'select' || field.type === 'multi_select'
        ? (field.options ?? []).map(o => o.value)
        : undefined,
  }));
}
