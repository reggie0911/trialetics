/** DB key on `ip_orders.metadata` */
export const IP_ORDER_CONTENTS_PER_UNIT_KEY = 'contents_per_catalog_unit' as const;

/** DB key on `ip_items.metadata` for default when adding orders */
export const IP_ITEM_DEFAULT_CONTENTS_PER_UNIT_KEY = 'default_contents_per_catalog_unit' as const;

export function parseContentsPerUnitFromJson(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  return i >= 1 ? i : null;
}

export function parseContentsPerCatalogUnitFromOrderMetadata(meta: unknown): number | null {
  if (!meta || typeof meta !== 'object') return null;
  return parseContentsPerUnitFromJson(
    (meta as Record<string, unknown>)[IP_ORDER_CONTENTS_PER_UNIT_KEY]
  );
}

export function parseDefaultContentsPerCatalogUnitFromItemMetadata(meta: unknown): number | null {
  if (!meta || typeof meta !== 'object') return null;
  return parseContentsPerUnitFromJson(
    (meta as Record<string, unknown>)[IP_ITEM_DEFAULT_CONTENTS_PER_UNIT_KEY]
  );
}

export function buildOrderMetadataPatch(contentsPerCatalogUnit: number): Record<string, unknown> {
  return { [IP_ORDER_CONTENTS_PER_UNIT_KEY]: Math.floor(contentsPerCatalogUnit) };
}
