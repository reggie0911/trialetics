"use client";

import { ChevronRight, ChevronsUpDown, Expand, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReconciliationCategory } from "./reconciliation-types";

interface ReconciliationCategoryNavProps {
  categories: ReconciliationCategory[];
  activeCategoryId: string | null;
  onNavigate: (categoryId: string) => void;
  expandedCategories: Set<string>;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export function ReconciliationCategoryNav({
  categories,
  activeCategoryId,
  onNavigate,
  expandedCategories,
  onExpandAll,
  onCollapseAll,
}: ReconciliationCategoryNavProps) {
  return (
    <div className="bg-white rounded-sm border p-3 sticky top-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Categories
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onExpandAll}
            title="Expand All"
          >
            <Expand className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onCollapseAll}
            title="Collapse All"
          >
            <Minimize className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <nav className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
        {categories.map((category) => {
          const isActive = activeCategoryId === category.id;
          const isExpanded = expandedCategories.has(category.id);
          const docCount = category.documents.length;
          const missingCount = category.documents.filter(
            (d) => d.presentInTMF === "no"
          ).length;

          return (
            <button
              key={category.id}
              onClick={() => onNavigate(category.id)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left text-[11px] transition-colors",
                isActive
                  ? "bg-[#4A90A4] text-white"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 flex-shrink-0 transition-transform",
                  isExpanded && "rotate-90"
                )}
              />
              <span className="flex-1 truncate">{category.name}</span>
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-sm",
                    isActive ? "bg-white/20" : "bg-muted"
                  )}
                >
                  {docCount}
                </span>
                {missingCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-red-500 text-white">
                    {missingCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
