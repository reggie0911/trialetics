import { z } from 'zod';

/**
 * Schema introspection for Copilot form filling.
 *
 * Walks an arbitrary Zod schema and produces a normalized field descriptor
 * list the agent can reason about: dot-paths, primitive types, enum values,
 * required flag, optional metadata. Importantly we do NOT inspect through
 * the form components — the Zod schemas are the source of truth across the
 * app (`react-hook-form` + `zodResolver` everywhere) so introspecting them
 * keeps form filling in sync without a second registry.
 */

export type FieldKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'enum'
  | 'array'
  | 'object'
  | 'unknown';

export interface FieldDescriptor {
  /** Dot-path within the form values, e.g. `pi.email` or `sites.0.name`. */
  path: string;
  kind: FieldKind;
  /** When `kind === 'enum'`, the valid values. */
  enumValues?: string[];
  required: boolean;
  /** Optional human-readable label used by the registry; not derived from Zod. */
  label?: string;
  /** Free-text guidance set on the registry (`hints`) for this field. */
  hints?: string[];
  /** When the field is itself an object, the children describe its fields. */
  children?: FieldDescriptor[];
  /** When the field is an array of objects, the item descriptor. */
  itemSchema?: FieldDescriptor;
}

/**
 * Best-effort unwrapping helper. Zod wraps optional, nullable, default,
 * effects, etc. — we strip them down to the inner schema so we can detect
 * the actual shape.
 */
function unwrap(schema: z.ZodTypeAny): { schema: z.ZodTypeAny; required: boolean } {
  let current: z.ZodTypeAny = schema;
  let required = true;

  // Walk up to 8 wrappers — anything deeper is exotic and we'll fall back
  // to `unknown`.
  for (let i = 0; i < 8; i += 1) {
    const def = current?._def as { typeName?: string } | undefined;
    const typeName = def?.typeName;
    const def2 = current._def as unknown as Record<string, z.ZodTypeAny | undefined>;
    if (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault') {
      required = false;
      current = (def2.innerType ?? def2.schema ?? current) as z.ZodTypeAny;
      continue;
    }
    if (typeName === 'ZodEffects') {
      current = (def2.schema ?? current) as z.ZodTypeAny;
      continue;
    }
    if (typeName === 'ZodPipeline') {
      current = (def2.out ?? current) as z.ZodTypeAny;
      continue;
    }
    if (typeName === 'ZodCatch' || typeName === 'ZodReadonly' || typeName === 'ZodBranded') {
      current = (def2.innerType ?? def2.type ?? current) as z.ZodTypeAny;
      continue;
    }
    break;
  }

  return { schema: current, required };
}

function describeNode(schema: z.ZodTypeAny, path: string): FieldDescriptor {
  const { schema: inner, required } = unwrap(schema);
  const def = inner?._def as { typeName?: string } | undefined;
  const typeName = def?.typeName;

  switch (typeName) {
    case 'ZodString':
      return { path, kind: 'string', required };
    case 'ZodNumber':
      return { path, kind: 'number', required };
    case 'ZodBoolean':
      return { path, kind: 'boolean', required };
    case 'ZodDate':
      return { path, kind: 'date', required };
    case 'ZodEnum': {
      const values = ((def as unknown as { values?: string[] }).values ?? []).map(String);
      return { path, kind: 'enum', enumValues: values, required };
    }
    case 'ZodNativeEnum': {
      const enumObj = (def as unknown as { values?: Record<string, string | number> }).values ?? {};
      const values = Object.values(enumObj).map(String);
      return { path, kind: 'enum', enumValues: values, required };
    }
    case 'ZodLiteral': {
      const value = (def as unknown as { value?: unknown }).value;
      return { path, kind: 'enum', enumValues: value !== undefined ? [String(value)] : [], required };
    }
    case 'ZodObject': {
      const shape = (inner as unknown as { shape: Record<string, z.ZodTypeAny> }).shape;
      const children = Object.entries(shape ?? {}).map(([key, child]) => {
        const childPath = path ? `${path}.${key}` : key;
        return describeNode(child, childPath);
      });
      return { path, kind: 'object', required, children };
    }
    case 'ZodArray': {
      const elementSchema = (inner._def as unknown as { type: z.ZodTypeAny }).type;
      const itemSchema = describeNode(elementSchema, path);
      return { path, kind: 'array', required, itemSchema };
    }
    case 'ZodUnion':
    case 'ZodDiscriminatedUnion': {
      // Pick the first option for shape purposes; downstream we treat the
      // union as `unknown` to be safe.
      const options = (inner._def as unknown as { options?: z.ZodTypeAny[] }).options;
      if (options?.length) {
        const first = describeNode(options[0], path);
        return { ...first, required };
      }
      return { path, kind: 'unknown', required };
    }
    case 'ZodAny':
    case 'ZodUnknown':
    default:
      return { path, kind: 'unknown', required };
  }
}

/** Walk a Zod schema and return a descriptor tree rooted at empty path. */
export function describeSchema(schema: z.ZodTypeAny): FieldDescriptor {
  return describeNode(schema, '');
}

/** Flatten a descriptor tree into a list of leaf-level descriptors. */
export function flattenFields(descriptor: FieldDescriptor): FieldDescriptor[] {
  if (descriptor.kind === 'object' && descriptor.children?.length) {
    return descriptor.children.flatMap(flattenFields);
  }
  // Leaf or array — return self (we don't recurse into array items by index;
  // the agent can propose `path` with explicit indices like `sites.0.name`).
  return [descriptor];
}

/**
 * Returns the dot-paths of fields the schema marks required (and the parent
 * does not make optional). Used to compute `missingRequired` after a fill.
 */
export function listRequiredPaths(descriptor: FieldDescriptor): string[] {
  const out: string[] = [];
  for (const field of flattenFields(descriptor)) {
    if (field.required) out.push(field.path);
  }
  return out;
}
