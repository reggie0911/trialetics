'use client';

import { ModuleNavbar } from '@/components/layout/module-navbar';

interface CTMSPageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function CTMSPageHeader({ title, subtitle, children }: CTMSPageHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-[32px] font-semibold mb-1 tracking-[-1px]">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {children}
        <ModuleNavbar />
      </div>
    </div>
  );
}
