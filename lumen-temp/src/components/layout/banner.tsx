'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Hook to check banner visibility - exported for use in other components
export const useBannerVisibility = (initialValue: boolean) => {
  const [isBannerVisible, setIsBannerVisible] = useState(initialValue);

  return { isBannerVisible, setIsBannerVisible };
};

const Banner = ({
  url = 'https://shadcnblocks.com',
  initialVisible = true,
}: {
  url?: string;
  initialVisible?: boolean;
}) => {
  const { isBannerVisible, setIsBannerVisible } =
    useBannerVisibility(initialVisible);

  const handleDismiss = () => {
    setIsBannerVisible(false);
    // Set cookie to remember dismissal (expires in 1 year)
    document.cookie =
      'banner-dismissed=true; path=/; max-age=31536000; SameSite=Lax';
    // Dispatch event for other components
    window.dispatchEvent(new Event('banner-dismissed'));
  };

  return (
    <div
      className={cn(
        'bg-primary relative overflow-hidden transition-all duration-300',
        // Use max-height and opacity for smooth transitions
        isBannerVisible ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0',
        // Hide completely after transition
        !isBannerVisible && 'pointer-events-none',
      )}
      style={{
        // Prevent layout shift by using grid with rows
        display: 'grid',
        gridTemplateRows: isBannerVisible ? '1fr' : '0fr',
      }}
    >
      <div className="overflow-hidden">
        <div className="container flex items-center justify-between gap-4 py-3 pr-12">
          <div className="flex flex-1 items-center justify-center gap-3 sm:gap-4">
            <span className="text-primary-foreground text-center text-sm font-medium">
              Purchase this theme on{' '}
              <span className="font-semibold">shadcnblocks.com</span>
            </span>
            <Button size="sm" variant="light" asChild>
              <a href={url} target="_blank">
                Get Template
              </a>
            </Button>
          </div>
          <button
            onClick={handleDismiss}
            className={cn(
              'absolute top-1/2 right-4 -translate-y-1/2 rounded-sm p-1.5',
              'text-primary-foreground/70 hover:text-primary-foreground',
              'transition-all duration-200 hover:scale-110 hover:bg-white/10',
              'focus:ring-2 focus:ring-white/30 focus:outline-none',
            )}
            aria-label="Close banner"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Banner;
