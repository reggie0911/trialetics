"use client";

import { Building2, FileCheck, FileX, TrendingUp, MapPin } from "lucide-react";
import { StudyComplianceSummary } from "./scorecard-types";
import { getComplianceBgColor } from "./scorecard-calculator";

interface ScorecardSummaryCardsProps {
  summary: StudyComplianceSummary;
}

export function ScorecardSummaryCards({ summary }: ScorecardSummaryCardsProps) {
  const cards = [
    {
      label: "Total Sites",
      value: summary.totalSites.toString(),
      icon: Building2,
      color: "bg-blue-500",
      subtext: "in study",
    },
    {
      label: "Avg Completion",
      value: `${summary.avgCompletionPercent}%`,
      icon: TrendingUp,
      color: getComplianceBgColor(summary.avgCompletionPercent),
      subtext: "overall",
      showProgress: true,
      progressValue: summary.avgCompletionPercent,
    },
    {
      label: "TMF Compliance",
      value: `${summary.avgTmfCompliancePercent}%`,
      icon: FileCheck,
      color: getComplianceBgColor(summary.avgTmfCompliancePercent),
      subtext: "documents in TMF",
      showProgress: true,
      progressValue: summary.avgTmfCompliancePercent,
    },
    {
      label: "Site Compliance",
      value: `${summary.avgSiteCompliancePercent}%`,
      icon: MapPin,
      color: getComplianceBgColor(summary.avgSiteCompliancePercent),
      subtext: "documents on-site",
      showProgress: true,
      progressValue: summary.avgSiteCompliancePercent,
    },
    {
      label: "Missing Documents",
      value: summary.totalMissingDocuments.toString(),
      icon: FileX,
      color: summary.totalMissingDocuments > 0 ? "bg-red-500" : "bg-green-500",
      subtext: "across all sites",
      isWarning: summary.totalMissingDocuments > 0,
    },
  ];

  return (
    <div className="bg-white rounded-sm border p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex flex-col gap-2 p-3 rounded-sm bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-sm ${card.color}`}>
                <card.icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">
                {card.label}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span
                className={`text-2xl font-bold ${
                  card.isWarning ? "text-red-600" : ""
                }`}
              >
                {card.value}
              </span>
              
              {card.showProgress && (
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${card.color}`}
                    style={{ width: `${Math.min(card.progressValue || 0, 100)}%` }}
                  />
                </div>
              )}
              
              <span className="text-[10px] text-muted-foreground">
                {card.subtext}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
