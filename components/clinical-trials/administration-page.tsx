'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, ClipboardList, UserCheck, Settings } from 'lucide-react';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';

const ADMIN_SECTIONS = [
  {
    label: 'System Countries',
    description: 'Manage countries and regions',
    icon: Globe,
    href: '/protected/clinical-trials/administration/countries',
  },
  {
    label: 'System Tables',
    description: 'Lookup tables and reference data',
    icon: ClipboardList,
    href: '/protected/clinical-trials/administration/system-tables',
  },
  {
    label: 'Roles',
    description: 'User roles and permissions',
    icon: UserCheck,
    href: '/protected/clinical-trials/administration/roles',
  },
  {
    label: 'Configuration',
    description: 'System configuration variables',
    icon: Settings,
    href: '/protected/clinical-trials/administration/config',
  },
];

export function AdministrationPage() {
  const { companyId } = useCTMS();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <CTMSPageHeader title="Administration" subtitle="System configuration and management" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ADMIN_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.href}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => router.push(section.href)}
            >
              <CardContent className="p-4 flex flex-col gap-2">
                <Icon className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{section.label}</p>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
