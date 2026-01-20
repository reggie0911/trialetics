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
    type: "link" as const,
    label: "MRace Tracker - View",
    href: "/protected/patients",
  },
  {
    type: "link" as const,
    label: "AE Metrics",
    href: "/protected/ae",
  },
  {
    type: "link" as const,
    label: "Query Metrics",
    href: "#",
  },
  {
    type: "link" as const,
    label: "Visit Window",
    href: "#",
  },
  {
    type: "link" as const,
    label: "Med Compliance",
    href: "/protected/mc",
  },
];

export function PatientsNavbar() {
  const pathname = usePathname();

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
                  pathname === item.href 
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
