"use client";

import { cn } from "@/lib/utils";
import { CategoryScore } from "./scorecard-types";
import { getComplianceColor, getComplianceBgColor } from "./scorecard-calculator";

interface ScorecardCategoryDetailsProps {
  categoryScores: CategoryScore[];
}

export function ScorecardCategoryDetails({
  categoryScores,
}: ScorecardCategoryDetailsProps) {
  return (
    <div className="bg-muted/20 border-t border-b">
      <div className="px-4 py-2 bg-muted/40 border-b">
        <span className="text-[11px] font-medium text-muted-foreground">
          Category Breakdown
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left p-2 pl-12 font-medium">Category</th>
              <th className="text-center p-2 font-medium w-24">Total Docs</th>
              <th className="text-center p-2 font-medium w-24">On-Site</th>
              <th className="text-center p-2 font-medium w-24">In TMF</th>
              <th className="text-left p-2 font-medium w-40">Completion</th>
            </tr>
          </thead>
          <tbody>
            {categoryScores.map((category, index) => {
              const isOdd = index % 2 === 1;
              const sitePercent =
                category.totalDocs > 0
                  ? Math.round((category.presentOnSite / category.totalDocs) * 100)
                  : 100;
              const tmfPercent =
                category.totalDocs > 0
                  ? Math.round((category.presentInTMF / category.totalDocs) * 100)
                  : 100;

              return (
                <tr
                  key={category.categoryId}
                  className={cn(
                    "border-b last:border-b-0",
                    isOdd ? "bg-white" : "bg-muted/10"
                  )}
                >
                  <td className="p-2 pl-12">{category.categoryName}</td>
                  <td className="p-2 text-center">{category.totalDocs}</td>
                  <td className="p-2 text-center">
                    <span
                      className={cn(
                        "font-medium",
                        getComplianceColor(sitePercent)
                      )}
                    >
                      {category.presentOnSite}/{category.totalDocs}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span
                      className={cn(
                        "font-medium",
                        getComplianceColor(tmfPercent)
                      )}
                    >
                      {category.presentInTMF}/{category.totalDocs}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[80px]">
                        <div
                          className={cn(
                            "h-1.5 rounded-full",
                            getComplianceBgColor(category.completionPercent)
                          )}
                          style={{
                            width: `${Math.min(category.completionPercent, 100)}%`,
                          }}
                        />
                      </div>
                      <span
                        className={cn(
                          "font-medium text-[10px]",
                          getComplianceColor(category.completionPercent)
                        )}
                      >
                        {category.completionPercent}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
