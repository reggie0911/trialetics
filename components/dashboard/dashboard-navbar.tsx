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
    label: "Dashboard",
    href: "#",
  },
  {
    type: "dropdown" as const,
    trigger: "Project Team",
    items: [
      { label: "Team Members", href: "#" },
      { label: "Team Roles", href: "#" },
      { label: "Team Schedule", href: "#" },
      { label: "Team Reports", href: "#" },
    ],
  },
  {
    type: "dropdown" as const,
    trigger: "Project Team Tasks",
    items: [
      { label: "All Tasks", href: "#" },
      { label: "In Progress", href: "#" },
      { label: "Completed", href: "#" },
      { label: "Overdue", href: "#" },
      { label: "Assigned Tasks", href: "#" },
    ],
  },
  {
    type: "dropdown" as const,
    trigger: "My Tasks",
    items: [
      { label: "My Active Tasks", href: "#" },
      { label: "My Completed Tasks", href: "#" },
      { label: "Task Calendar", href: "#" },
      { label: "Task Analytics", href: "#" },
    ],
  },
];

export function DashboardNavbar() {
  return (
    <NavigationMenu className="w-auto">
      <NavigationMenuList className="flex-col sm:flex-row justify-end">
        {menuItems.map((item, index) =>
          item.type === "dropdown" ? (
            <NavigationMenuItem key={index}>
              <NavigationMenuTrigger className="text-xs sm:text-sm">{item.trigger}</NavigationMenuTrigger>
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
