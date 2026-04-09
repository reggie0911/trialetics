/**
 * Split an integer total across `count` slots so the parts sum to `total`.
 * First `total % count` slots get floor(total/count)+1; the rest get floor(total/count).
 */
export function splitIntegerTotal(total: number, index: number, count: number): number {
  if (count <= 0) return total;
  const safeTotal = Math.max(0, Math.trunc(total));
  const n = Math.trunc(count);
  if (n <= 1) return safeTotal;
  const clampedIndex = Math.min(Math.max(0, index), n - 1);
  const base = Math.floor(safeTotal / n);
  const rem = safeTotal % n;
  return base + (clampedIndex < rem ? 1 : 0);
}
