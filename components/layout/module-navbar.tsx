"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/client";
import { ChevronDown, ChevronRight } from "lucide-react";

const CTMS_DISABLED_COMPANY_ID = "397cadc7-e336-4497-ae17-6ec178de33c1";

interface DropdownItem {
  label: string;
  href: string;
  group?: string;
  projectRelative?: string;
}

function buildCtmsItems(projectId: string | null): DropdownItem[] {
  const p = (path: string) =>
    projectId ? `/protected/clinical-trials/project/${projectId}${path}` : "";

  return [
    { group: "Home", label: "Global Contacts", href: "/protected/contacts-organizations" },
    { group: "Home", label: "Global Institutions", href: "/protected/contacts-organizations#institutions" },
    { group: "Home", label: "Activity Calendar", href: "/protected/clinical-trials/calendar" },
    { group: "Home", label: "Reports", href: "/protected/reports" },

    { group: "Protocol Deviations", label: "Protocol Deviations", href: "/protected/deviations" },
    { group: "Site Visit Reports", label: "Site Visit Reports", href: p("/svr"), projectRelative: "/svr" },

    { group: "Finance", label: "Clinical Payments", href: "/protected/clinical-payments" },
    { group: "Finance", label: "Budget Templates", href: "/protected/budget-templates" },
    { group: "Finance", label: "Rate Lists", href: "/protected/clinical-trials/rate-lists" },

    { group: "Administration", label: "System Admin", href: "/protected/clinical-trials/administration" },
    { group: "Administration", label: "System Countries", href: "/protected/clinical-trials/administration/countries" },
    { group: "Administration", label: "System Tables", href: "/protected/clinical-trials/administration/system-tables" },
    { group: "Administration", label: "Roles", href: "/protected/clinical-trials/administration/roles" },
    { group: "Administration", label: "Configuration", href: "/protected/clinical-trials/administration/config" },
    { group: "Administration", label: "Audit Trail", href: "/protected/audit-trail" },

    { group: "Other Tools", label: "Org Chart", href: "/protected/contacts-organizations/org-chart" },
    { group: "Other Tools", label: "Clinical Trip Reports", href: "/protected/trip-reports" },
    { group: "Other Tools", label: "Document Management", href: "/protected/document-management" },
    { group: "Other Tools", label: "Site Portal", href: "/protected/site-portal" },
    { group: "Other Tools", label: "Clinical Training", href: "/protected/clinical-training" },
    { group: "Other Tools", label: "Visit Templates", href: "/protected/visit-templates" },
    { group: "Other Tools", label: "Source Data Verification", href: "/protected/source-data-verification" },
    { group: "Other Tools", label: "Vendor Management", href: "/protected/vendor-management" },
    { group: "Other Tools", label: "eTMF", href: "/protected/etmf" },
    { group: "Other Tools", label: "IRB/EC Tracking", href: "/protected/irb-tracking" },
    { group: "Other Tools", label: "Site Startup", href: "/protected/site-startup" },
    { group: "Other Tools", label: "Action Items", href: "/protected/action-items" },
    { group: "Other Tools", label: "Deviations & CAPA", href: "/protected/deviations" },
    { group: "Other Tools", label: "Workflows", href: "/protected/workflows" },
    { group: "Other Tools", label: "Custom Trackers", href: "/protected/custom-trackers" },
    { group: "Other Tools", label: "Integrations", href: "/protected/integrations/edc" },
    { group: "Other Tools", label: "Risk Management", href: "/protected/risk-management" },
    { group: "Other Tools", label: "Randomization & Supply", href: "/protected/randomization-supply" },
    { group: "Other Tools", label: "Feasibility", href: "/protected/feasibility" },
    { group: "Other Tools", label: "Patient Engagement", href: "/protected/patient-engagement" },
  ];
}

const CTMS_GROUPS = ["Home", "Protocol Deviations", "Site Visit Reports", "Finance", "Administration", "Other Tools"];

const trackerItems: DropdownItem[] = [
  { label: "MRace Tracker - View", href: "/protected/patients" },
  { label: "AE Metrics", href: "/protected/ae" },
  { label: "eCRF Query Tracker", href: "/protected/ecrf-query-tracker" },
  { label: "SDV Tracker", href: "/protected/sdv-tracker" },
  { label: "Visit Window", href: "/protected/vw" },
  { label: "Med Compliance", href: "/protected/mc" },
];

const analyticsItems: DropdownItem[] = [
  { label: "Enrollment Forecasting", href: "/protected/enrollment-forecasting" },
  { label: "Financial Forecasting", href: "/protected/financial-forecasting" },
  { label: "KRI Monitor", href: "/protected/kri-monitor" },
  { label: "Ad-Hoc Reports", href: "/protected/reports" },
  { label: "Portfolio Overview", href: "/protected/portfolio" },
  { label: "Resource Management", href: "/protected/resources" },
];

const PROTOCOL_ID_STORAGE_KEY = "trialetics_active_protocol_id";

export function ModuleNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Home: true,
    "Protocol Deviations": true,
    "Site Visit Reports": true,
  });

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  useEffect(() => {
    const loadCompanyId = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (profile?.company_id) setCompanyId(profile.company_id);
    };
    loadCompanyId();
  }, []);

  const urlProtocolId =
    searchParams.get("protocolId") ??
    searchParams.get("projectId") ??
    searchParams.get("protocol");

  const [resolvedProtocolId, setResolvedProtocolId] = useState<string | null>(urlProtocolId);

  useEffect(() => {
    if (urlProtocolId) {
      try { localStorage.setItem(PROTOCOL_ID_STORAGE_KEY, urlProtocolId); } catch {}
      setResolvedProtocolId(urlProtocolId);
    } else {
      try {
        const stored = localStorage.getItem(PROTOCOL_ID_STORAGE_KEY);
        if (stored) setResolvedProtocolId(stored);
      } catch {}
    }
  }, [urlProtocolId]);

  const projectIdFromUrl = pathname.match(/\/project\/([^/]+)/)?.[1] ?? null;
  const activeProjectId = projectIdFromUrl ?? resolvedProtocolId;

  const ctmsItems = buildCtmsItems(activeProjectId);

  const hideCtms = companyId === CTMS_DISABLED_COMPANY_ID;

  const getHrefWithParams = (href: string) => {
    const protocolId = resolvedProtocolId;
    if (href === "/protected/dashboard") {
      return protocolId ? `${href}?protocolId=${protocolId}` : "/protected";
    }
    const trackerHrefs = [
      "/protected/patients",
      "/protected/ae",
      "/protected/ecrf-query-tracker",
      "/protected/sdv-tracker",
      "/protected/vw",
      "/protected/mc",
    ];
    if (trackerHrefs.includes(href)) {
      return protocolId ? `${href}?protocol=${protocolId}` : "/protected";
    }
    return href;
  };

  const isActive = (href: string) => {
    if (!href) return false;
    if (href === "/protected/dashboard") {
      return pathname.startsWith("/protected/dashboard");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isCtmsActive = ctmsItems.some((item) => item.href && isActive(item.href));

  const isDropdownActive = (items: { href: string }[]) =>
    items.some((item) => isActive(item.href));

  const linkClasses = "text-[11px] h-auto py-2 px-3 transition-all";
  const activeLinkClasses =
    "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground";
  const inactiveLinkClasses = "hover:bg-primary/10";

  const renderDropdownItem = (subItem: DropdownItem, needsProjectContext = false) => {
    const disabled = needsProjectContext && subItem.projectRelative !== undefined && !subItem.href;
    return (
      <NavigationMenuLink asChild key={subItem.label}>
        {disabled ? (
          <span
            className="block rounded-sm px-3 py-1.5 text-xs text-muted-foreground/50 cursor-default"
            title="Select a project first"
          >
            {subItem.label}
          </span>
        ) : (
          <Link
            href={getHrefWithParams(subItem.href)}
            className={cn(
              "block rounded-sm px-3 py-1.5 text-xs font-normal transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive(subItem.href) && "bg-accent/50 font-medium"
            )}
          >
            {subItem.label}
          </Link>
        )}
      </NavigationMenuLink>
    );
  };

  return (
    <NavigationMenu viewport={false} className="w-auto">
      <NavigationMenuList className="flex-col sm:flex-row gap-2">
        {/* Dashboard link */}
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link
              href={getHrefWithParams("/protected/dashboard")}
              className={cn(
                navigationMenuTriggerStyle(),
                linkClasses,
                isActive("/protected/dashboard")
                  ? activeLinkClasses
                  : inactiveLinkClasses
              )}
            >
              Dashboard
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        {/* CTMS dropdown with collapsible groups */}
        {!hideCtms && (
          <NavigationMenuItem>
            <NavigationMenuTrigger
              className={cn(
                navigationMenuTriggerStyle(),
                linkClasses,
                isCtmsActive ? activeLinkClasses : inactiveLinkClasses
              )}
            >
              CTMS
            </NavigationMenuTrigger>
            <NavigationMenuContent>
              <div className="w-[240px] max-h-[227px] overflow-y-auto p-1 bg-white">
                {CTMS_GROUPS.map((group) => {
                  const groupItems = ctmsItems.filter((i) => i.group === group);
                  if (groupItems.length === 0) return null;
                  const isExpanded = expandedGroups[group] ?? false;
                  const needsProjectContext = group === "Site Visit Reports";
                  const hasActiveItem = groupItems.some((i) => i.href && isActive(i.href));
                  return (
                    <div key={group} className="mb-0.5">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-accent/50 cursor-pointer",
                          hasActiveItem ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {group}
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="ml-1 border-l pl-1">
                          {groupItems.map((subItem) =>
                            renderDropdownItem(subItem, needsProjectContext)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
        )}

        {/* Trackers dropdown */}
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(
              navigationMenuTriggerStyle(),
              linkClasses,
              isDropdownActive(trackerItems)
                ? activeLinkClasses
                : inactiveLinkClasses
            )}
          >
            Trackers
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-48 p-2">
              {trackerItems.map((subItem, subIndex) => (
                <NavigationMenuLink asChild key={subIndex}>
                  <Link
                    href={getHrefWithParams(subItem.href)}
                    className={cn(
                      "block rounded-sm px-2 py-2 text-xs font-normal transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive(subItem.href) && "bg-accent/50 font-medium"
                    )}
                  >
                    {subItem.label}
                  </Link>
                </NavigationMenuLink>
              ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Analytics dropdown */}
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(
              navigationMenuTriggerStyle(),
              linkClasses,
              isDropdownActive(analyticsItems)
                ? activeLinkClasses
                : inactiveLinkClasses
            )}
          >
            Analytics
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-48 p-2">
              {analyticsItems.map((subItem, subIndex) => (
                <NavigationMenuLink asChild key={subIndex}>
                  <Link
                    href={getHrefWithParams(subItem.href)}
                    className={cn(
                      "block rounded-sm px-2 py-2 text-xs font-normal transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive(subItem.href) && "bg-accent/50 font-medium"
                    )}
                  >
                    {subItem.label}
                  </Link>
                </NavigationMenuLink>
              ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
