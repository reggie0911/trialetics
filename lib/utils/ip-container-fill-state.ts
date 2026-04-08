/** Stored on ip_ledger_entries.metadata.container_fill_state for IP accountability. */
export const CONTAINER_FILL_STATE_VALUES = ['full', 'partial', 'empty'] as const;
export type ContainerFillState = (typeof CONTAINER_FILL_STATE_VALUES)[number];

export const CONTAINER_FILL_STATE_LABELS: Record<ContainerFillState, string> = {
  full: 'Full',
  partial: 'Partially used',
  empty: 'Empty',
};

export function isContainerFillState(v: string): v is ContainerFillState {
  return (CONTAINER_FILL_STATE_VALUES as readonly string[]).includes(v);
}

/** Human label for grid UI; returns null if unknown or empty. */
export function labelContainerFillState(raw: string | null | undefined): string | null {
  if (raw == null || raw.trim() === '') return null;
  const k = raw.trim().toLowerCase();
  if (isContainerFillState(k)) return CONTAINER_FILL_STATE_LABELS[k];
  return null;
}
