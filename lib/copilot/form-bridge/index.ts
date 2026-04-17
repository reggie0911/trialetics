/**
 * Public surface for the Copilot form-bridge.
 *
 * Server-only sub-modules (`proposal-store`, `mapping-store`,
 * `template-builder`) intentionally are NOT re-exported here so client
 * components don't accidentally import them and explode at build time.
 */
export * from './schema-introspector';
export * from './field-mapper';
export * from './apply-fill';
export * from './validators';
export * from './dynamic-schema';
export * from './form-builder';
export * from './table-builder';
