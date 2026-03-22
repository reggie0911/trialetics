'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

interface DocsScreenshotProps {
  src: string;
  alt: string;
}

export function DocsScreenshot({ src, alt }: DocsScreenshotProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <figure className="my-6 not-prose">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="block w-full rounded-lg border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-zoom-in"
        >
          <img
            src={src}
            alt={alt}
            className="w-full h-auto"
            loading="lazy"
          />
        </button>
        {alt && (
          <figcaption className="mt-2 text-center text-[11px] text-muted-foreground">
            {alt}
          </figcaption>
        )}
      </figure>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
