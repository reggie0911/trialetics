import { cn } from '@/lib/utils';

/** 1) Label: 12–14px, 600, primary (light: #000; dark: foreground). */
export const metricLabelClass =
  'text-xs sm:text-sm font-semibold text-black dark:text-foreground';

/** Forecast panel / emphasis label: 12px, 600 (e.g. site enrollment right column). */
export const metricLabelClassEmphasis =
  'text-xs font-semibold text-black dark:text-foreground';

/** 2) Primary value: 24px, semibold, ~1.12 line-height, strongest contrast. */
export const metricValueClass =
  'text-[24px] font-semibold leading-[1.12] tracking-tight text-foreground tabular-nums';

export const metricValueClassNonTabular = metricValueClass.replace(' tabular-nums', '');

/** Date strings in forecast panels; same type ramp as `metricValueClassNonTabular`. */
export const metricValueClassDate24 = metricValueClassNonTabular;

/** In-line secondary fragment next to a large number (e.g. %). */
export const metricValueInlineSecondaryClass = 'text-xs font-medium text-muted-foreground sm:text-sm';

/** 3) Supporting line. */
export const metricSupportingClass = 'text-xs sm:text-sm font-normal leading-tight text-muted-foreground';

/** 4) CTA: 10px, 400, sky link (matches compact KPI links). */
export const metricCtaClass =
  'text-[10px] font-normal text-sky-500 underline-offset-2 transition-colors hover:text-sky-600 dark:text-sky-400 dark:hover:text-sky-300 hover:underline';

export function metricCtaButtonClass(className?: string) {
  return cn('self-start pt-1.5 text-left', metricCtaClass, className);
}
