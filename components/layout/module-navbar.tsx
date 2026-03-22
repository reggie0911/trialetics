"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

const trackerItems = [
  { label: "MRace Tracker", href: "/protected/patients" },
  { label: "AE Metrics", href: "/protected/ae" },
  { label: "eCRF Query Tracker", href: "/protected/ecrf-query-tracker" },
  { label: "SDV Tracker", href: "/protected/sdv-tracker" },
  { label: "Visit Window", href: "/protected/vw" },
  { label: "Med Compliance", href: "/protected/mc" },
];

const linkClasses = "text-[11px] h-auto py-2 px-3 transition-all";
const activeLinkClasses = "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground";
const inactiveLinkClasses = "hover:bg-primary/10";

export function ModuleNavbar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isDropdownActive = trackerItems.some((item) => isActive(item.href));

  return (
    <NavigationMenu viewport={false} className="w-auto">
      <NavigationMenuList className="flex-col sm:flex-row gap-2">
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link
              href="/protected"
              className={cn(
                navigationMenuTriggerStyle(),
                linkClasses,
                isActive("/protected") && !trackerItems.some((i) => isActive(i.href)) && !isActive("/protected/docs")
                  ? activeLinkClasses
                  : inactiveLinkClasses
              )}
            >
              Home
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(
              navigationMenuTriggerStyle(),
              linkClasses,
              isDropdownActive ? activeLinkClasses : inactiveLinkClasses
            )}
          >
            Trackers
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="w-48 p-2">
              {trackerItems.map((subItem, subIndex) => (
                <NavigationMenuLink asChild key={subIndex}>
                  <Link
                    href={subItem.href}
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
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link
              href="/protected/docs"
              className={cn(
                navigationMenuTriggerStyle(),
                linkClasses,
                isActive("/protected/docs")
                  ? activeLinkClasses
                  : inactiveLinkClasses
              )}
            >
              Docs
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
