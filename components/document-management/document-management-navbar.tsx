"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    label: "SDV Tracker",
    href: "/protected/sdv-tracker",
  },
  {
    label: "Visit Window",
    href: "/protected/vw",
  },
  {
    label: "Med Compliance",
    href: "/protected/mc",
  },
  {
    label: "Document Management",
    href: "/protected/document-management",
  },
];

export function DocumentManagementNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  // Check if current path matches (handles query params)
  const isActive = (href: string) => {
    if (href === "/protected/dashboard") {
      return pathname.startsWith("/protected/dashboard");
    }
    if (href === "/protected/document-management/upload") {
      return pathname.startsWith("/protected/document-management/upload");
    }
    return pathname === href;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
          "text-[11px] h-auto py-2 px-3 transition-all hover:bg-primary/10 cursor-pointer outline-none"
        )}
      >
        Modules
        <ChevronDown className="ml-2 h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 p-0.5">
        {menuItems.map((item, index) => (
          <DropdownMenuItem 
            key={index} 
            className={cn(
              "transition-all duration-200 ease-in-out cursor-pointer",
              isActive(item.href)
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
            onClick={() => {
              router.push(item.href);
            }}
          >
            <span className="w-full block text-xs">
              {item.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
