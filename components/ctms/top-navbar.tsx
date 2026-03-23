'use client';

import { useMemo, useState } from 'react';
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
  Shield,
  LineChart,
  BookOpen,
  Clock,
  FilePenLine,
  ContactRound,
  Package,
  FolderOpen,
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
import { studyTrackerNavItems } from '@/lib/nav/study-trackers';
import type { StudyTrackerNavItem } from '@/lib/nav/study-trackers';
import type { SubscriptionPlan } from '@/lib/types/ctms';
import { cn } from '@/lib/utils';

const ctmsNavItems = [
  { label: 'Dashboard', href: '/protected', icon: LayoutDashboard, exact: true },
  { label: 'Studies', href: '/protected/studies', icon: FlaskConical },
  { label: 'Sites', href: '/protected/sites', icon: Building2 },
  { label: 'Subjects', href: '/protected/subjects', icon: Users },
  { label: 'Countries', href: '/protected/countries', icon: Globe },
  { label: 'Team', href: '/protected/team', icon: UsersRound },
  {
    label: 'Contacts & organizations',
    href: '/protected/directory',
    icon: ContactRound,
  },
  { label: 'Visits', href: '/protected/visits', icon: ClipboardCheck },
  { label: 'Trip Reports', href: '/protected/trip-reports', icon: FileText },
  { label: 'My Tasks', href: '/protected/my-tasks', icon: CheckSquare },
  { label: 'Project Team Tasks', href: '/protected/tasks', icon: ListTodo },
  { label: 'Financials', href: '/protected/financials', icon: DollarSign },
  { label: 'Invoice approvals', href: '/protected/financials/approvals', icon: FilePenLine },
  { label: 'Reports', href: '/protected/reports', icon: BarChart3 },
  {
    label: 'Investigational product',
    href: '/protected/investigational-product',
    icon: Package,
  },
];

const proFeatureRoutes = [
  '/protected/financials',
  '/protected/financials/approvals',
  '/protected/reports',
  '/protected/time-expenses',
];
const enterpriseFeatureRoutes: string[] = [];

export type CustomTrackerNavItem = {
  id: string;
  name: string;
  slug: string;
};

interface TopNavbarProps {
  /** When false, CTMS nav and inline AI are hidden (tracker/eTMF-only tenants). */
  hasCtmsAccess: boolean;
  hasTrackerAccess: boolean;
  hasEtmfAccess: boolean;
  hasEisfAccess: boolean;
  isPlatformAdmin: boolean;
  /** Keys from `companies.enabled_study_tracker_keys` to show under Custom → Study trackers (serializable). */
  studyTrackerMenuKeys: string[];
  customTrackerNavItems: CustomTrackerNavItem[];
  companyName: string | null;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  currentPlan: SubscriptionPlan;
}

function getPageName(pathname: string, customNames: CustomTrackerNavItem[]): string {
  if (pathname.startsWith('/protected/eisf')) return 'eISF';
  if (pathname.startsWith('/protected/etmf')) return 'eTMF';
  if (pathname.startsWith('/protected/platform/')) return 'Platform admin';
  for (const t of customNames) {
    if (pathname === `/protected/custom-trackers/${t.slug}` || pathname.startsWith(`/protected/custom-trackers/${t.slug}/`)) {
      return t.name;
    }
  }
  if (pathname.startsWith('/protected/custom-trackers')) return 'Custom trackers';
  const allItems = [...ctmsNavItems, ...studyTrackerNavItems];
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
  hasCtmsAccess,
  hasTrackerAccess,
  hasEtmfAccess,
  hasEisfAccess,
  isPlatformAdmin,
  studyTrackerMenuKeys,
  customTrackerNavItems,
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

  const studyTrackerMenuItems = useMemo(
    () => studyTrackerNavItems.filter((i) => studyTrackerMenuKeys.includes(i.key)),
    [studyTrackerMenuKeys]
  );

  const pageName = getPageName(pathname, customTrackerNavItems);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isLocked = (href: string) => {
    const requiresPro = proFeatureRoutes.some((r) => href === r || href.startsWith(`${r}/`));
    const requiresEnterprise = enterpriseFeatureRoutes.some((r) => href === r || href.startsWith(`${r}/`));
    return (requiresPro && currentPlan === 'basic') || (requiresEnterprise && currentPlan !== 'enterprise');
  };

  const isCtmsActive =
    hasCtmsAccess && ctmsNavItems.some((item) => isActive(item.href, item.exact));
  const isEtmfActive = pathname === '/protected/etmf' || pathname.startsWith('/protected/etmf/');
  const isEisfActive = pathname === '/protected/eisf' || pathname.startsWith('/protected/eisf/');
  const isCustomActive =
    studyTrackerNavItems.some((item) => isActive(item.href)) ||
    pathname.startsWith('/protected/custom-trackers');

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
            {/* CTMS — always shown (like eTMF); menu items only when licensed */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-normal transition-colors whitespace-nowrap outline-none border border-border',
                  hasCtmsAccess
                    ? isCtmsActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                CTMS
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="min-w-48">
                {hasCtmsAccess ? (
                  ctmsNavItems.map((item) => {
                    const locked = isLocked(item.href);
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
                  })
                ) : (
                  <div className="px-2 py-2 text-xs text-muted-foreground">Not enabled for your organization</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* eTMF */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-normal transition-colors whitespace-nowrap outline-none border border-border',
                  hasEtmfAccess
                    ? isEtmfActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                eTMF
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="min-w-48">
                {hasEtmfAccess ? (
                  <>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/protected/etmf')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Overview
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/protected/etmf/library')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Document Library
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/protected/etmf/expected-documents')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Expected Document List
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/protected/etmf/staff-expected-documents')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Site Staff EDL
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/protected/etmf/bulk-upload')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Bulk Uploader
                    </DropdownMenuItem>
                  </>
                ) : (
                  <div className="px-2 py-2 text-xs text-muted-foreground">Not enabled for your organization</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* eISF */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-normal transition-colors whitespace-nowrap outline-none border border-border',
                  hasEisfAccess
                    ? isEisfActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                eISF
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="min-w-52">
                {hasEisfAccess ? (
                  <>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/protected/eisf')}>
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Overview
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/protected/eisf/folders')}>
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Site folders
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/protected/eisf/requests')}>
                      <FileText className="mr-2 h-4 w-4" />
                      Document requests
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/protected/eisf/rules')}>
                      <Shield className="mr-2 h-4 w-4" />
                      Required documents
                    </DropdownMenuItem>
                  </>
                ) : (
                  <div className="px-2 py-2 text-xs text-muted-foreground">Not enabled for your organization</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Custom (study trackers + custom definitions) */}
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
                <DropdownMenuContent align="end" sideOffset={8} className="min-w-48 max-h-[min(24rem,70vh)] overflow-y-auto">
                  {studyTrackerMenuItems.length > 0 ? (
                    <>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Study trackers
                      </div>
                      {studyTrackerMenuItems.map((item) => (
                        <DropdownMenuItem key={item.href} className="cursor-pointer" onClick={() => router.push(item.href)}>
                          <item.icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                    </>
                  ) : (
                    <div className="px-2 py-2 text-xs text-muted-foreground">No study trackers enabled for your organization.</div>
                  )}
                  {customTrackerNavItems.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Custom
                      </div>
                      {customTrackerNavItems.map((t) => (
                        <DropdownMenuItem
                          key={t.id}
                          className="cursor-pointer"
                          onClick={() => router.push(`/protected/custom-trackers/${t.slug}`)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {t.name}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/protected/custom-trackers')}>
                        <FileText className="mr-2 h-4 w-4" />
                        All custom trackers…
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Modules — includes platform admin entry when entitled */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-normal text-muted-foreground hover:text-foreground hover:bg-muted transition-colors whitespace-nowrap outline-none border border-border">
                Modules
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="min-w-52 max-h-[min(24rem,70vh)] overflow-y-auto">
                {hasCtmsAccess && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Clinical operations
                    </div>
                    {[{ href: '/protected/time-expenses', label: 'Time & Expenses' }].map((item) => {
                      const locked = isLocked(item.href);
                      return (
                        <DropdownMenuItem
                          key={item.href}
                          className={cn('cursor-pointer', locked && 'opacity-50')}
                          onClick={() => router.push(locked ? '/protected/settings/billing' : item.href)}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          {item.label}
                          {locked && <Lock className="h-2.5 w-2.5 ml-auto" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </>
                )}
                {isPlatformAdmin && (
                  <>
                    {hasCtmsAccess && <DropdownMenuSeparator />}
                    <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Platform
                    </div>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => router.push('/protected/platform/companies')}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Company module access
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => router.push('/protected/platform/docs')}
                    >
                      <FilePenLine className="mr-2 h-4 w-4" />
                      Documentation editor
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => router.push('/protected/platform/analytics')}
                    >
                      <LineChart className="mr-2 h-4 w-4" />
                      Platform analytics
                    </DropdownMenuItem>
                  </>
                )}
                {!hasCtmsAccess && !isPlatformAdmin && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">Coming soon</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              href="/protected/docs"
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-normal transition-colors whitespace-nowrap border border-border',
                pathname.startsWith('/protected/docs')
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <BookOpen className="h-3 w-3" />
              Docs
            </Link>
          </div>

          {hasCtmsAccess && <AIAssistantInlineButton />}
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
              {isPlatformAdmin && (
                <>
                  <DropdownMenuItem
                    onClick={() => router.push('/protected/platform/companies')}
                    className="cursor-pointer"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Company module access
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push('/protected/platform/docs')}
                    className="cursor-pointer"
                  >
                    <FilePenLine className="mr-2 h-4 w-4" />
                    Documentation editor
                  </DropdownMenuItem>
                </>
              )}
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
            {hasCtmsAccess ? (
              ctmsNavItems.map((item) => {
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
              })
            ) : (
              <div className="px-4 py-2 text-sm text-muted-foreground">Not enabled for your organization</div>
            )}
            <Separator className="my-2" />
            <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">eISF</p>
            {hasEisfAccess ? (
              <>
                <Link
                  href="/protected/eisf"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                    pathname === '/protected/eisf' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <FolderOpen className="h-4 w-4" />
                  Overview
                </Link>
                <Link
                  href="/protected/eisf/folders"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                    pathname.startsWith('/protected/eisf/folders') ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <FolderOpen className="h-4 w-4" />
                  Site folders
                </Link>
                <Link
                  href="/protected/eisf/requests"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                    pathname.startsWith('/protected/eisf/requests') ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Document requests
                </Link>
                <Link
                  href="/protected/eisf/rules"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                    pathname.startsWith('/protected/eisf/rules') ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Required documents
                </Link>
              </>
            ) : (
              <div className="px-4 py-2 text-sm text-muted-foreground">Not enabled for your organization</div>
            )}
            <Separator className="my-2" />
            <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">eTMF</p>
            {hasEtmfAccess ? (
              <>
                <Link
                  href="/protected/etmf"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                    pathname === '/protected/etmf' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Overview
                </Link>
                <Link
                  href="/protected/etmf/library"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                    pathname.startsWith('/protected/etmf/library') ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Document Library
                </Link>
                <Link
                  href="/protected/etmf/expected-documents"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                    pathname === '/protected/etmf/expected-documents' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Expected Document List
                </Link>
                <Link
                  href="/protected/etmf/staff-expected-documents"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                    pathname === '/protected/etmf/staff-expected-documents' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Site Staff EDL
                </Link>
                <Link
                  href="/protected/etmf/bulk-upload"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                    pathname === '/protected/etmf/bulk-upload' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Bulk Uploader
                </Link>
              </>
            ) : (
              <div className="px-4 py-2 text-sm text-muted-foreground">Not enabled for your organization</div>
            )}

            {hasTrackerAccess && (
              <>
                <Separator className="my-2" />
                <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Custom</p>
                {studyTrackerMenuItems.length > 0 ? (
                  <>
                    <p className="px-4 py-1 text-[10px] text-muted-foreground">Study trackers</p>
                    {studyTrackerMenuItems.map((item) => {
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
                ) : (
                  <p className="px-4 py-2 text-xs text-muted-foreground">No study trackers enabled.</p>
                )}
                {customTrackerNavItems.length > 0 && (
                  <>
                    <p className="px-4 py-1 text-[10px] text-muted-foreground">Builder</p>
                    {customTrackerNavItems.map((t) => (
                      <Link
                        key={t.id}
                        href={`/protected/custom-trackers/${t.slug}`}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm transition-colors text-muted-foreground hover:bg-muted"
                      >
                        <FileText className="h-4 w-4" />
                        {t.name}
                      </Link>
                    ))}
                    <Link
                      href="/protected/custom-trackers"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm transition-colors text-muted-foreground hover:bg-muted"
                    >
                      <FileText className="h-4 w-4" />
                      All custom trackers…
                    </Link>
                  </>
                )}
              </>
            )}

            <Separator className="my-2" />
            <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Modules</p>
            {hasCtmsAccess && (
              <>
                <p className="px-4 py-1 text-[10px] text-muted-foreground">Clinical operations</p>
                {[{ href: '/protected/time-expenses', label: 'Time & Expenses' }].map((item) => {
                  const locked = isLocked(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={locked ? '/protected/settings/billing' : item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 text-sm transition-colors text-muted-foreground hover:bg-muted',
                        locked && 'opacity-50',
                      )}
                    >
                      <Clock className="h-4 w-4" />
                      {item.label}
                      {locked && <Lock className="h-3 w-3 ml-auto" />}
                    </Link>
                  );
                })}
              </>
            )}
            {isPlatformAdmin && (
              <>
                {hasCtmsAccess && <p className="px-4 py-1 text-[10px] text-muted-foreground">Platform</p>}
                <Link
                  href="/protected/platform/companies"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm transition-colors text-muted-foreground hover:bg-muted"
                >
                  <Shield className="h-4 w-4" />
                  Company module access
                </Link>
                <Link
                  href="/protected/platform/docs"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm transition-colors text-muted-foreground hover:bg-muted"
                >
                  <FilePenLine className="h-4 w-4" />
                  Documentation editor
                </Link>
                <Link
                  href="/protected/platform/analytics"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm transition-colors text-muted-foreground hover:bg-muted"
                >
                  <LineChart className="h-4 w-4" />
                  Platform analytics
                </Link>
              </>
            )}
            {!hasCtmsAccess && !isPlatformAdmin && (
              <div className="px-4 py-2 text-sm text-muted-foreground">Coming soon</div>
            )}

            <Separator className="my-2" />
            <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Help</p>
            <Link
              href="/protected/docs"
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                pathname.startsWith('/protected/docs')
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <BookOpen className="h-4 w-4" />
              Documentation
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      <ProfileSettingsModal open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
}
