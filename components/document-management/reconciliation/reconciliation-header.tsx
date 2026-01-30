"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReconciliationSite } from "./reconciliation-types";

interface ReconciliationHeaderProps {
  studyName: string;
  sites: ReconciliationSite[];
  selectedSiteId: string;
  onSiteChange: (siteId: string) => void;
  lastUpdated: string;
}

export function ReconciliationHeader({
  studyName,
  sites,
  selectedSiteId,
  onSiteChange,
  lastUpdated,
}: ReconciliationHeaderProps) {
  const selectedSite = sites.find((s) => s.id === selectedSiteId);

  return (
    <div className="bg-[#4A90A4] text-white rounded-sm p-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">{studyName}</h2>
          <p className="text-[11px] text-white/80">Investigator Study File Tracker</p>
        </div>

        <div className="flex items-center gap-6">
          {/* Site Selector */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-medium whitespace-nowrap">
              Site Name (#):
            </label>
            <Select value={selectedSiteId} onValueChange={onSiteChange}>
              <SelectTrigger className="w-[120px] h-7 bg-white text-black border-0 text-[11px]">
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id} className="text-[11px]">
                    {site.siteNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Updated */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-medium whitespace-nowrap">
              Date Updated:
            </label>
            <span className="text-[11px] font-bold">{lastUpdated}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
