"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    label: "Dashboard",
    href: "/protected/dashboard",
  },
  {
    label: "MRace Tracker - View",
    href: "/protected/patients",
  },
  {
    label: "AE Metrics",
    href: "/protected/ae",
  },
  {
    label: "eCRF Query Tracker",
    href: "/protected/ecrf-query-tracker",
  },
  {
    label: "Visit Window",
    href: "/protected/vw",
  },
  {
    label: "Med Compliance",
    href: "/protected/mc",
  },
];

export function ModuleNavbar() {
  const pathname = usePathname();

  // Check if current path matches (handles query params)
  const isActive = (href: string) => {
    if (href === "/protected/dashboard") {
      return pathname.startsWith("/protected/dashboard");
    }
    return pathname === href;
  };

  return (
    <NavigationMenu className="w-auto">
      <NavigationMenuList className="flex-col sm:flex-row justify-end gap-2">
        {menuItems.map((item, index) => (
          <NavigationMenuItem key={index}>
            <NavigationMenuLink asChild>
              <Link
                href={item.href}
                className={cn(
                  navigationMenuTriggerStyle(),
                  "text-[11px] h-auto py-2 px-3 transition-all",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" 
                    : "hover:bg-primary/10"
                )}
              >
                {item.label}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
