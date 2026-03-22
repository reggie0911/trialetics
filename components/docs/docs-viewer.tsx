'use client';

import { isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DocsScreenshot } from './docs-screenshot';
import { formatDocLastUpdatedForDisplay } from '@/lib/docs/format-last-updated-display';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

interface DocsViewerProps {
  content: string;
  lastUpdated?: string;
}

export function DocsViewer({ content, lastUpdated }: DocsViewerProps) {
  return (
    <div className="flex-1 min-w-0 overflow-y-auto py-6 px-4 lg:px-8">
      {lastUpdated && (
        <p className="text-[10px] text-muted-foreground mb-4">
          Last updated: {formatDocLastUpdatedForDisplay(lastUpdated, 'long')}
        </p>
      )}
      <article
        className={[
          'prose prose-sm dark:prose-invert max-w-none',
          'prose-headings:scroll-mt-20',
          'prose-h1:mt-0 prose-h1:mb-2 prose-h1:text-xl prose-h1:font-bold',
          'prose-h2:mt-5 prose-h2:mb-1.5 prose-h2:text-lg prose-h2:font-semibold',
          'prose-h3:mt-3.5 prose-h3:mb-1 prose-h3:text-base prose-h3:font-medium',
          'prose-h4:mt-3 prose-h4:mb-1 prose-h4:text-[13px] prose-h4:font-semibold',
          'prose-p:mt-0 prose-p:mb-2 prose-p:text-[13px] prose-p:leading-snug',
          'prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-[13px]',
          '[&_li>p]:m-0 [&_li>p]:leading-snug',
          'prose-hr:my-4',
          'prose-table:text-[12px] prose-td:py-1.5 prose-th:py-1.5',
          'prose-code:text-[12px]',
          'prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:text-[12px]',
          'prose-a:text-primary',
        ].join(' ')}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children, ...props }) => {
              const text = extractText(children);
              const id = slugify(text);
              return <h1 id={id} {...props}>{children}</h1>;
            },
            h2: ({ children, ...props }) => {
              const text = extractText(children);
              const id = slugify(text);
              return <h2 id={id} {...props}>{children}</h2>;
            },
            h3: ({ children, ...props }) => {
              const text = extractText(children);
              const id = slugify(text);
              return <h3 id={id} {...props}>{children}</h3>;
            },
            img: ({ src, alt }) => {
              if (typeof src !== 'string' || !src) return null;
              const altText = typeof alt === 'string' ? alt : '';
              return <DocsScreenshot src={src} alt={altText} />;
            },
            blockquote: ({ children, ...props }) => {
              return (
                <blockquote
                  className="border-l-4 border-primary/30 bg-muted/50 rounded-r-md px-3 py-2 my-2 not-prose"
                  {...props}
                >
                  <div className="text-[12px] text-muted-foreground [&>p]:m-0 [&>p]:text-[12px]">
                    {children}
                  </div>
                </blockquote>
              );
            },
            table: ({ children, ...props }) => (
              <div className="overflow-x-auto my-2 rounded-md border border-border">
                <table className="w-full text-[12px]" {...props}>{children}</table>
              </div>
            ),
            th: ({ children, ...props }) => (
              <th className="bg-muted/50 px-3 py-2 text-left font-semibold text-[11px] uppercase tracking-wider" {...props}>
                {children}
              </th>
            ),
            td: ({ children, ...props }) => (
              <td className="px-3 py-2 border-t border-border" {...props}>{children}</td>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </div>
  );
}

function extractText(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (isValidElement<{ children?: ReactNode }>(children)) {
    return extractText(children.props.children);
  }
  return '';
}
