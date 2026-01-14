'use client';

import { useState, useMemo } from 'react';
import { SiteSquare } from './site-square';
import { mockSiteMetrics, SiteMetrics } from '@/lib/mock-data/site-metrics';

export function SiteMetricsHeatmap() {
  const [hoveredSite, setHoveredSite] = useState<SiteMetrics | null>(null);
  const [pinnedSite, setPinnedSite] = useState<SiteMetrics | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Memoize the counts to prevent hydration mismatches
  const { compliantCount, notCompliantCount } = useMemo(() => ({
    compliantCount: mockSiteMetrics.filter(s => s.isCompliant).length,
    notCompliantCount: mockSiteMetrics.filter(s => !s.isCompliant).length,
  }), []);

  const handleSiteHover = (site: SiteMetrics, event: React.MouseEvent) => {
    // Only show hover tooltip if no site is pinned
    if (!pinnedSite) {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.right + 10,
        y: rect.top,
      });
      setHoveredSite(site);
    }
  };

  const handleSiteLeave = () => {
    // Only clear hover if no site is pinned
    if (!pinnedSite) {
      setHoveredSite(null);
    }
  };

  const handleSiteClick = (site: SiteMetrics, event: React.MouseEvent) => {
    // If clicking the already pinned site, unpin it
    if (pinnedSite?.siteNumber === site.siteNumber) {
      setPinnedSite(null);
      setHoveredSite(null);
    } else {
      // Pin this site
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.right + 10,
        y: rect.top,
      });
      setPinnedSite(site);
      setHoveredSite(null);
    }
  };

  // Show tooltip for either pinned or hovered site
  const displaySite = pinnedSite || hoveredSite;

  return (
    <div className="w-full flex flex-col md:flex-row gap-4">
      <div className="flex flex-col gap-2">
        {/* Site Count Display */}
        <div className="flex items-end gap-2">
          <div className="text-4xl sm:text-5xl font-bold tracking-tight">{mockSiteMetrics.length}</div>
          <div className="pb-1 text-xs sm:text-sm font-normal text-muted-foreground">Total Sites</div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-teal-400" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              Compliant ({compliantCount})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-red-500" />
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              Not Compliant ({notCompliantCount})
            </span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="relative overflow-x-auto">
        <div className="grid grid-cols-13 gap-1 w-fit min-w-max">
          {mockSiteMetrics.map((site) => (
            <div
              key={site.siteNumber}
              onMouseEnter={(e) => handleSiteHover(site, e)}
              onMouseLeave={handleSiteLeave}
            >
              <SiteSquare
                siteNumber={site.siteNumber}
                isCompliant={site.isCompliant}
                onClick={(e) => handleSiteClick(site, e)}
                siteData={site}
                isPinned={pinnedSite?.siteNumber === site.siteNumber}
              />
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {displaySite && (
          <div
            className="fixed z-50 w-64 sm:w-72 rounded-lg border border-border bg-popover p-2 shadow-lg"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] sm:text-xs font-semibold">Site Details</h3>
              {pinnedSite && (
                <span className="text-[10px] sm:text-xs text-muted-foreground">(Pinned)</span>
              )}
            </div>
            <div className="space-y-1">
              <DetailRow label="Study Name:" value={displaySite.studyName} />
              <DetailRow label="Site Name:" value={displaySite.siteName} />
              <DetailRow label="Site Number:" value={displaySite.siteNumber} />
              <DetailRow label="CRFs Verified:" value={displaySite.crfsVerified} />
              <DetailRow 
                label="Open Queries:" 
                value={displaySite.openQueries}
                highlight={displaySite.openQueries > 0}
              />
              <DetailRow label="Answered Queries:" value={displaySite.answeredQueries} />
              <DetailRow label="SDV %:" value={`${displaySite.sdvPercentage}%`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface DetailRowProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

function DetailRow({ label, value, highlight }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between py-0.5 border-b border-border last:border-0">
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <span className={`text-[10px] font-semibold ${highlight ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}
