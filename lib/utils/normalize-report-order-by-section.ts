/**
 * Normalizes report_order so questions sharing the same report_sub_section
 * also share the same report_order. Order numbers increment per unique
 * sub-section, starting from startOrder.
 */
export function normalizeReportOrderBySection<
  T extends { report_sub_section?: string | null; report_order?: number },
>(
  questions: T[],
  startOrder: number
): (T & { report_order: number })[] {
  const sectionToOrder = new Map<string, number>();
  let nextOrder = startOrder;
  return questions.map((q) => {
    const key = (q.report_sub_section || 'GENERAL').trim().toUpperCase();
    if (!sectionToOrder.has(key)) sectionToOrder.set(key, nextOrder++);
    return { ...q, report_order: sectionToOrder.get(key)! };
  });
}
