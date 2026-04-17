'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DraftKind } from '@/lib/copilot/drafts';

const KIND_OPTIONS: { value: DraftKind; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'memo', label: 'Memo' },
  { value: 'narrative', label: 'Clinical narrative' },
  { value: 'report', label: 'Report' },
  { value: 'document', label: 'Document' },
  { value: 'message', label: 'Message' },
  { value: 'other', label: 'Other' },
];

export function DraftCreator() {
  const router = useRouter();
  const [kind, setKind] = useState<DraftKind>('email');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const create = () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/ai/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, title, body, agentId: 'draft-author' }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Failed to create draft');
        return;
      }
      const { draft } = (await res.json()) as { draft: { id: string } };
      router.push(`/protected/copilot/drafts/${draft.id}`);
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <Select value={kind} onValueChange={v => setKind(v as DraftKind)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Draft title (e.g. Email to PI: missing visit window)"
        />
      </div>
      <Textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Initial draft body. You can paste a generated draft here, or start from scratch and edit later."
        rows={8}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button onClick={create} disabled={isPending}>
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          {isPending ? 'Creating…' : 'Create draft'}
        </Button>
      </div>
    </div>
  );
}
