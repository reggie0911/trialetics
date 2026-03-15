'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FlaskConical,
  Building2,
  Users,
  Globe,
  UsersRound,
  ClipboardCheck,
  DollarSign,
  BarChart3,
  FileQuestion,
  Calendar,
  Pill,
  ChevronRight,
  ListTodo,
  CheckSquare,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { SidebarUserFooter } from '@/components/ctms/sidebar-header';
import type { SubscriptionPlan } from '@/lib/types/ctms';

const ctmsNavItems = [
  {
    label: 'Dashboard',
    href: '/protected',
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: 'Studies',
    href: '/protected/studies',
    icon: FlaskConical,
  },
  {
    label: 'Sites',
    href: '/protected/sites',
    icon: Building2,
  },
  {
    label: 'Subjects',
    href: '/protected/subjects',
    icon: Users,
  },
  {
    label: 'Countries',
    href: '/protected/countries',
    icon: Globe,
  },
  {
    label: 'Team',
    href: '/protected/team',
    icon: UsersRound,
  },
  {
    label: 'Visits',
    href: '/protected/visits',
    icon: ClipboardCheck,
  },
  {
    label: 'My Tasks',
    href: '/protected/my-tasks',
    icon: CheckSquare,
  },
  {
    label: 'Project Team Tasks',
    href: '/protected/tasks',
    icon: ListTodo,
  },
  {
    label: 'Financials',
    href: '/protected/financials',
    icon: DollarSign,
  },
  {
    label: 'Reports',
    href: '/protected/reports',
    icon: BarChart3,
  },
];

const trackerNavItems = [
  { label: 'MRace Tracker', href: '/protected/patients', icon: Users },
  { label: 'AE Metrics', href: '/protected/ae', icon: BarChart3 },
  { label: 'eCRF Query Tracker', href: '/protected/ecrf-query-tracker', icon: FileQuestion },
  { label: 'SDV Tracker', href: '/protected/sdv-tracker', icon: ClipboardCheck },
  { label: 'Visit Window', href: '/protected/vw', icon: Calendar },
  { label: 'Med Compliance', href: '/protected/mc', icon: Pill },
];

const proFeatureRoutes = ['/protected/financials', '/protected/reports'];
const enterpriseFeatureRoutes: string[] = [];

interface SidebarNavProps {
  hasTrackerAccess: boolean;
  companyName: string | null;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  currentPlan: SubscriptionPlan;
}

export function SidebarNav({ hasTrackerAccess, companyName, userName, userEmail, avatarUrl, currentPlan }: SidebarNavProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const label = companyName ?? 'Trialetics';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/protected" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FlaskConical className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{label}</span>
                <span className="truncate text-xs text-muted-foreground flex items-center gap-1">
                  Clinical Trials
                  {currentPlan !== 'basic' && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 leading-none">
                      {currentPlan === 'enterprise' ? 'ENT' : 'PRO'}
                    </Badge>
                  )}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Trial Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ctmsNavItems.map((item) => {
                const requiresPro = proFeatureRoutes.includes(item.href);
                const requiresEnterprise = enterpriseFeatureRoutes.includes(item.href);
                const isLocked = (requiresPro && currentPlan === 'basic') || (requiresEnterprise && currentPlan !== 'enterprise');

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={isLocked ? '/protected/settings/billing' : item.href} />}
                      isActive={isActive(item.href, item.exact)}
                      tooltip={isLocked ? `${item.label} (Upgrade required)` : item.label}
                    >
                      <item.icon className={isLocked ? 'opacity-40' : ''} />
                      <span className={isLocked ? 'opacity-40' : ''}>{item.label}</span>
                      {isLocked && (
                        <Badge variant="outline" className="ml-auto text-[8px] px-1 py-0 h-3.5 leading-none shrink-0">
                          PRO
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasTrackerAccess && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarGroupLabel render={<CollapsibleTrigger />} className="flex w-full items-center cursor-pointer">
                  Trackers
                  <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {trackerNavItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            render={<Link href={item.href} />}
                            isActive={isActive(item.href)}
                            tooltip={item.label}
                          >
                            <item.icon />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarUserFooter
        userName={userName}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
      />

      <SidebarRail />
    </Sidebar>
  );
}
