"use client";

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

const menuItems = [
  {
    type: "link" as const,
    label: "Dashboard",
    href: "/protected/dashboard",
  },
  {
    type: "dropdown" as const,
    trigger: "CTMS",
    items: [
      { label: "Contacts & Organizations", href: "/protected/contacts-organizations" },
      { label: "Org Chart", href: "/protected/contacts-organizations/org-chart" },
      { label: "Clinical Trip Reports", href: "/protected/trip-reports" },
      { label: "Document Management", href: "/protected/document-management" },
      { label: "Clinical Trials Management", href: "/protected/clinical-trials" },
      { label: "Activity Calendar", href: "/protected/clinical-trials/calendar" },
      { label: "Rate Lists", href: "/protected/clinical-trials/rate-lists" },
      { label: "Clinical Payments", href: "/protected/clinical-payments" },
      { label: "Clinical Training", href: "/protected/clinical-training" },
      { label: "Visit Templates", href: "/protected/visit-templates" },
      { label: "Source Data Verification", href: "/protected/source-data-verification" },
    ],
  },
  {
    type: "dropdown" as const,
    trigger: "Trackers",
    items: [
      { label: "MRace Tracker - View", href: "/protected/patients" },
      { label: "AE Metrics", href: "/protected/ae" },
      { label: "eCRF Query Tracker", href: "/protected/ecrf-query-tracker" },
      { label: "SDV Tracker", href: "/protected/sdv-tracker" },
      { label: "Visit Window", href: "/protected/vw" },
      { label: "Med Compliance", href: "/protected/mc" },
    ],
  },
];

export function ModuleNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getHrefWithParams = (href: string) => {
    const protocolId =
      searchParams.get("protocolId") ??
      searchParams.get("projectId") ??
      searchParams.get("protocol");
    if (!protocolId) return href;
    if (href === "/protected/dashboard") {
      return `${href}?protocolId=${protocolId}`;
    }
    // Tracker pages use ?protocol= in the URL
    const trackerHrefs = [
      "/protected/patients",
      "/protected/ae",
      "/protected/ecrf-query-tracker",
      "/protected/sdv-tracker",
      "/protected/vw",
      "/protected/mc",
    ];
    if (trackerHrefs.includes(href)) {
      return `${href}?protocol=${protocolId}`;
    }
    return href;
  };

  const isActive = (href: string) => {
    if (href === "/protected/dashboard") {
      return pathname.startsWith("/protected/dashboard");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isDropdownActive = (items: { href: string }[]) =>
    items.some((item) => isActive(item.href));

  const linkClasses = "text-[11px] h-auto py-2 px-3 transition-all";
  const activeLinkClasses =
    "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground";
  const inactiveLinkClasses = "hover:bg-primary/10";

  return (
    <NavigationMenu viewport={false} className="w-auto">
      <NavigationMenuList className="flex-col sm:flex-row gap-2">
        {menuItems.map((item, index) =>
          item.type === "dropdown" ? (
            <NavigationMenuItem key={index}>
              <NavigationMenuTrigger
                className={cn(
                  navigationMenuTriggerStyle(),
                  linkClasses,
                  isDropdownActive(item.items)
                    ? activeLinkClasses
                    : inactiveLinkClasses
                )}
              >
                {item.trigger}
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-48 p-2">
                  {item.items.map((subItem, subIndex) => (
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
          ) : (
            <NavigationMenuItem key={index}>
              <NavigationMenuLink asChild>
                <Link
                  href={getHrefWithParams(item.href)}
                  className={cn(
                    navigationMenuTriggerStyle(),
                    linkClasses,
                    isActive(item.href)
                      ? activeLinkClasses
                      : inactiveLinkClasses
                  )}
                >
                  {item.label}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          )
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
