import Link from 'next/link';
import { CircleHelp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DocsHelpLinkProps {
  slug: string;
  section?: string;
  className?: string;
}

export function DocsHelpLink({ slug, section, className }: DocsHelpLinkProps) {
  const href = section
    ? `/protected/docs/${slug}#${section}`
    : `/protected/docs/${slug}`;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            className={className}
            aria-label="View documentation"
          />
        }
      >
        <CircleHelp className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[11px]">
        View documentation
      </TooltipContent>
    </Tooltip>
  );
}
