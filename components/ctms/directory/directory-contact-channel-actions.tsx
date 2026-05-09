'use client';

import { Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function DirectoryContactChannelActions({
  kind,
  value,
}: {
  kind: 'email' | 'phone';
  value: string;
}) {
  const trimmed = value.trim();
  const Icon = kind === 'email' ? Mail : Phone;
  const copyLabel = kind === 'email' ? 'Copy email' : 'Copy phone';
  const ariaLabel = kind === 'email' ? 'Email actions' : 'Phone actions';
  const successToast = kind === 'email' ? 'Email copied' : 'Phone copied';
  const emptyToast = kind === 'email' ? 'No email on file.' : 'No phone on file.';

  const copy = async () => {
    if (!trimmed) {
      toast.message(emptyToast);
      return;
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error('no clipboard');
      await navigator.clipboard.writeText(trimmed);
      toast.success(successToast);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={ariaLabel}>
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void copy()}>
          <Icon className="h-3.5 w-3.5" />
          {copyLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
