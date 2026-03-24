'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Study } from '@/lib/types/ctms';

interface SiteDemoStudyPickerProps {
  studies: Study[];
}

export function SiteDemoStudyPicker({ studies }: SiteDemoStudyPickerProps) {
  const [studyId, setStudyId] = useState<string>(studies[0]?.id ?? '');

  if (studies.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          No studies found. Create a study first, add at least one country to it, then return here to run the demo.
        </p>
        <Button size="sm" render={<Link href="/protected/studies/new" />} nativeButton={false}>
          Create a study
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  const href =
    studyId.length > 0
      ? `/protected/sites/new?studyId=${encodeURIComponent(studyId)}&demo=1`
      : '/protected/sites/demo';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <label htmlFor="demo-study" className="text-sm font-medium">
          Study
        </label>
        <Select value={studyId} onValueChange={setStudyId}>
          <SelectTrigger id="demo-study" className="w-full text-xs">
            <SelectValue placeholder="Select a study" />
          </SelectTrigger>
          <SelectContent>
            {studies.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.protocol_number} — {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" render={<Link href={href} />} nativeButton={false} disabled={!studyId}>
        Continue with demo
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
