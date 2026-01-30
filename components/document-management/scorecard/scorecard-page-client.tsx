"use client";

import { useState } from "react";
import { FileCheck } from "lucide-react";
import { ScorecardSummaryCards } from "./scorecard-summary-cards";
import { ScorecardSiteTable } from "./scorecard-site-table";
import { ScorecardMissingList } from "./scorecard-missing-list";
import { MOCK_SCORECARD_DATA } from "./scorecard-mock-data";
import { SiteComplianceScore } from "./scorecard-types";

interface ScorecardPageClientProps {
  companyId: string;
}

export function ScorecardPageClient({ companyId }: ScorecardPageClientProps) {
  const [selectedSiteForMissing, setSelectedSiteForMissing] =
    useState<SiteComplianceScore | null>(null);

  // Use mock data for now - will be replaced with Supabase later
  const scorecardData = MOCK_SCORECARD_DATA;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-[#4A90A4] text-white rounded-sm p-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            <div>
              <h1 className="text-sm font-semibold">Compliance Scorecard</h1>
              <p className="text-[11px] opacity-80">
                Regulatory Document Reconciliation Progress
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <div>
              <span className="opacity-70">Study: </span>
              <span className="font-semibold">{scorecardData.studyName}</span>
            </div>
            <div>
              <span className="opacity-70">Study ID: </span>
              <span className="font-semibold">{scorecardData.studyId}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <ScorecardSummaryCards summary={scorecardData} />

      {/* Site Breakdown Table */}
      <ScorecardSiteTable
        siteScores={scorecardData.siteScores}
        onViewMissing={(site) => setSelectedSiteForMissing(site)}
      />

      {/* Missing Documents Modal */}
      <ScorecardMissingList
        open={!!selectedSiteForMissing}
        onOpenChange={(open) => {
          if (!open) setSelectedSiteForMissing(null);
        }}
        site={selectedSiteForMissing}
      />
    </div>
  );
}
