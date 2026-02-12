'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface TripReportSectionCardProps {
  title: string;
  count?: number;
  children: React.ReactNode;
  className?: string;
}

export function TripReportSectionCard({ title, count, children, className }: TripReportSectionCardProps) {
  const headerText = count !== undefined ? `${title} (${count})` : title;
  return (
    <Card className={className}>
      <CardHeader className="bg-muted/50 border-b py-2.5 px-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide">{headerText}</h3>
      </CardHeader>
      <CardContent className="py-4 px-4">{children}</CardContent>
    </Card>
  );
}
