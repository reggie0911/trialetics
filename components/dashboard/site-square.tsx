'use client';

import { SiteMetrics } from '@/lib/mock-data/site-metrics';

interface SiteSquareProps {
  siteNumber: string;
  isCompliant: boolean;
  onClick: (e: React.MouseEvent) => void;
  siteData: SiteMetrics;
  isPinned?: boolean;
}

export function SiteSquare({
  siteNumber,
  isCompliant,
  onClick,
  isPinned,
}: SiteSquareProps) {
  return (
    <button
      onClick={onClick}
      className={`
        h-[55px] w-[55px] 
        flex items-center justify-center
        text-xs font-medium
        rounded cursor-pointer
        transition-all duration-200
        hover:scale-105 hover:shadow-md
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${isPinned ? 'ring-4 ring-primary' : ''}
        text-black
      `}
      style={{
        backgroundColor: isCompliant ? '#17B890' : '#F70000',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isCompliant ? '#139074' : '#D60000';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isCompliant ? '#17B890' : '#F70000';
      }}
      aria-label={`Site ${siteNumber}, ${isCompliant ? 'Compliant' : 'Not Compliant'}`}
      type="button"
    >
      {siteNumber}
    </button>
  );
}
