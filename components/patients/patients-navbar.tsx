"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

const menuItems = [
  {
    type: "link" as const,
    label: "Patient Data",
    href: "#",
  },
  {
    type: "dropdown" as const,
    trigger: "Reports",
    items: [
      { label: "Monthly Summary", href: "#" },
      { label: "Site Performance", href: "#" },
      { label: "Adverse Events", href: "#" },
      { label: "Data Quality", href: "#" },
    ],
  },
  {
    type: "dropdown" as const,
    trigger: "Data Management",
    items: [
      { label: "Upload History", href: "#" },
      { label: "Export Data", href: "#" },
      { label: "Archive", href: "#" },
      { label: "Data Validation", href: "#" },
    ],
  },
  {
    type: "dropdown" as const,
    trigger: "Analytics",
    items: [
      { label: "Enrollment Trends", href: "#" },
      { label: "Visit Compliance", href: "#" },
      { label: "Safety Metrics", href: "#" },
      { label: "Custom Reports", href: "#" },
    ],
  },
];

export function PatientsNavbar() {
  return (
    <NavigationMenu className="w-auto">
      <NavigationMenuList className="flex-col sm:flex-row justify-end">
        {menuItems.map((item, index) =>
          item.type === "dropdown" ? (
            <NavigationMenuItem key={index}>
              <NavigationMenuTrigger className="text-xs">{item.trigger}</NavigationMenuTrigger>
              <NavigationMenuContent>
                    <div className="w-48 p-2">
                      {item.items.map((subItem, subIndex) => (
                        <NavigationMenuLink 
                          href={subItem.href} 
                          key={subIndex}
                          className="block select-none space-y-1 rounded-md p-3 text-xs font-normal leading-none no-underline outline-none transition-all hover:bg-accent hover:text-accent-foreground hover:font-medium focus:bg-accent focus:text-accent-foreground"
                        >
                          {subItem.label}
                        </NavigationMenuLink>
                      ))}
                    </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ) : (
            <NavigationMenuItem key={index}>
              <NavigationMenuLink
                className={navigationMenuTriggerStyle()}
                href={item.href}
              >
                {item.label}
              </NavigationMenuLink>
            </NavigationMenuItem>
          )
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
