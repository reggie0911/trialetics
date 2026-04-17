'use client';

import { Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Button that mounts next to a form heading and opens the FormFillCard.
 *
 * The actual fill flow lives in `<FormFillCard />`, which the parent renders
 * inside a Sheet conditional on the button's `open` state. We surface a
 * dedicated trigger so the button can carry tooltip + analytics + read-only
 * gating uniformly.
 */
export function FillWithCopilotButton({
  schemaId,
  schemaLabel,
  onClick,
  disabled,
  size = 'sm',
}: {
  schemaId: string;
  schemaLabel?: string;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'icon';
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={size}
            disabled={disabled}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="gap-1.5"
            data-copilot-form-id={schemaId}
            style={{
              borderColor: hovered ? 'var(--copilot-accent)' : undefined,
              color: hovered ? 'var(--copilot-accent)' : undefined,
            }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--copilot-accent)' }} />
            <span>Fill with Copilot</span>
          </Button>
        }
      />
      <TooltipContent side="bottom" className="max-w-xs text-xs">
        Drop a document or pull from page context — the Copilot drafts values for {schemaLabel ?? 'this form'} and you review every field before saving.
      </TooltipContent>
    </Tooltip>
  );
}
