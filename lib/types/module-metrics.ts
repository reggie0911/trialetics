export interface MetricStat {
  label: string;
  value: string | number;
  highlight?: boolean; // for attention items
  delta?: number; // for showing increases/decreases
}

export type MetricStatus = 'success' | 'warning' | 'danger';

export interface ModuleMetric {
  id: string;
  title: string;
  status: MetricStatus;
  stats: MetricStat[];
  detailsLink?: string;
}
