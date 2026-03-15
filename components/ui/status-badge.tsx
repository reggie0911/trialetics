import { Badge } from './badge';
import { getStatusConfig } from '@/lib/utils/status-config';

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  return (
    <Badge variant={config.variant} className={className}>
      {label ?? config.label}
    </Badge>
  );
}
