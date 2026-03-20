'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Menu,
  LogOut,
  Settings,
  CreditCard,
  ChevronDown,
  Lock,
  ListTodo,
  CheckSquare,
  FileText,
} from 'lucide-react';

import Logo from '@/components/layout/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { AIAssistantInlineButton } from '@/components/ai-assistant';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ProfileSettingsModal } from '@/components/profile/profile-settings-modal';
import { createClient } from '@/lib/client';
import type { SubscriptionPlan } from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

const ctmsNavItems = [
  { label: 'Dashboard', href: '/protected', icon: LayoutDashboard, exact: true },
  { label: 'Studies', href: '/protected/studies', icon: FlaskConical },
  { label: 'Sites', href: '/protected/sites', icon: Building2 },
  { label: 'Subjects', href: '/protected/subjects', icon: Users },
  { label: 'Countries', href: '/protected/countries', icon: Globe },
  { label: 'Team', href: '/protected/team', icon: UsersRound },
  { label: 'Visits', href: '/protected/visits', icon: ClipboardCheck },
  { label: 'Trip Reports', href: '/protected/trip-reports', icon: FileText },
  { label: 'My Tasks', href: '/protected/my-tasks', icon: CheckSquare },
  { label: 'Project Team Tasks', href: '/protected/tasks', icon: ListTodo },
  { label: 'Financials', href: '/protected/financials', icon: DollarSign },
  { label: 'Reports', href: '/protected/reports', icon: BarChart3 },
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

interface TopNavbarProps {
  hasTrackerAccess: boolean;
  companyName: string | null;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  currentPlan: SubscriptionPlan;
}

function getPageName(pathname: string): string {
  const allItems = [...ctmsNavItems, ...trackerNavItems];
  for (const item of allItems) {
    if ('exact' in item && item.exact) {
      if (pathname === item.href) return item.label;
    } else {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return item.label;
    }
  }
  if (pathname.startsWith('/protected/settings')) return 'Settings';
  return 'Dashboard';
}

export function TopNavbar({
  hasTrackerAccess,
  companyName,
  userName,
  userEmail,
  avatarUrl,
  currentPlan,
}: TopNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const pageName = getPageName(pathname);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isLocked = (href: string) => {
    const requiresPro = proFeatureRoutes.includes(href);
    const requiresEnterprise = enterpriseFeatureRoutes.includes(href);
    return (requiresPro && currentPlan === 'basic') || (requiresEnterprise && currentPlan !== 'enterprise');
  };

  const isCtmsActive = ctmsNavItems.some((item) => isActive(item.href, item.exact));
  const isCustomActive = trackerNavItems.some((item) => isActive(item.href));

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center border-b bg-background px-4 gap-4">
        {/* Left: Logo + Page Name */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="[&_img]:w-[96px] [&_img]:h-auto">
            <Logo onlyLogo href="/protected" />
          </div>
          <Separator orientation="vertical" className="h-6" />
          <span className="text-base font-light text-[rgb(50,51,56)] dark:text-white hidden sm:inline">{companyName ?? pageName}</span>
        </div>

        {/* Right: Nav Dropdowns + AI + Theme + User */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {/* Compact Nav Dropdowns (desktop) */}
          <div className="hidden lg:flex items-center gap-1">
            {/* CTMS */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-normal transition-colors whitespace-nowrap outline-none border border-border',
                  isCtmsActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                CTMS
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="min-w-48">
                {ctmsNavItems.map((item) => {
                  const locked = isLocked(item.href);
                  const active = isActive(item.href, item.exact);
                  return (
                    <DropdownMenuItem
                      key={item.href}
                      className={cn('cursor-pointer', locked && 'opacity-50')}
                      onClick={() => router.push(locked ? '/protected/settings/billing' : item.href)}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                      {locked && <Lock className="h-2.5 w-2.5 ml-auto" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* eTMF (placeholder) */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-normal text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap outline-none border border-border">
                eTMF
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="min-w-48">
                <div className="px-2 py-2 text-xs text-muted-foreground">Coming soon</div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Custom (trackers) - gated by hasTrackerAccess */}
            {hasTrackerAccess && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-normal transition-colors whitespace-nowrap outline-none border border-border',
                    isCustomActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  Custom
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="min-w-48">
                  {trackerNavItems.map((item) => (
                    <DropdownMenuItem key={item.href} className="cursor-pointer" onClick={() => router.push(item.href)}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Modules (placeholder) */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-normal text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap outline-none border border-border">
                Modules
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="min-w-48">
                <div className="px-2 py-2 text-xs text-muted-foreground">Coming soon</div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <AIAssistantInlineButton />
          <ThemeToggle className="h-9 w-9" />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 outline-none hover:bg-muted transition-colors">
              <Avatar className="h-7 w-7 !rounded-md after:!rounded-md">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} className="rounded-md" />}
                <AvatarFallback className="text-[10px] rounded-md">{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="min-w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowSettings(true)} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/protected/settings/billing')} className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
                {currentPlan !== 'basic' && (
                  <Badge variant="outline" className="ml-auto text-[8px] px-1 py-0 h-3.5">
                    {currentPlan === 'enterprise' ? 'ENT' : 'PRO'}
                  </Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile hamburger */}
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </nav>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-sm">Navigation</SheetTitle>
            <SheetDescription className="sr-only">Application navigation menu</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col py-2 overflow-y-auto max-h-[calc(100vh-60px)]">
            <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">CTMS</p>
            {ctmsNavItems.map((item) => {
              const locked = isLocked(item.href);
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={locked ? '/protected/settings/billing' : item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                    active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted',
                    locked && 'opacity-50',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {locked && <Lock className="h-3 w-3 ml-auto" />}
                </Link>
              );
            })}

            <Separator className="my-2" />
            <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">eTMF</p>
            <div className="px-4 py-2 text-sm text-muted-foreground">Coming soon</div>

            {hasTrackerAccess && (
              <>
                <Separator className="my-2" />
                <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Custom</p>
                {trackerNavItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                        active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </>
            )}

            <Separator className="my-2" />
            <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Modules</p>
            <div className="px-4 py-2 text-sm text-muted-foreground">Coming soon</div>
          </div>
        </SheetContent>
      </Sheet>

      <ProfileSettingsModal open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
}
