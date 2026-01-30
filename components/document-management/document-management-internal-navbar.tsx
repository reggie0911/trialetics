"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Home",
    href: "/protected/document-management",
  },
  {
    label: "Document Upload",
    href: "/protected/document-management/upload",
  },
  {
    label: "Reconciliation Tracker",
    href: "/protected/document-management/reconciliation",
  },
  {
    label: "Compliance Scorecard",
    href: "/protected/document-management/scorecard",
  },
];

export function DocumentManagementInternalNavbar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/protected/document-management") {
      return pathname === "/protected/document-management";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="flex items-center gap-2 border-b pb-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-xs px-3 py-1.5 rounded-md transition-all",
            isActive(item.href)
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
