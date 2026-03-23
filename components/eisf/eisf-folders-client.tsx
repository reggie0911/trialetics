'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, useTransition } from 'react';
import { ensureEisfFolderForSite } from '@/lib/actions/eisf';
import type { EisfSiteFolder } from '@/lib/types/eisf';
import type { StudySiteWithStudy } from '@/lib/types/ctms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function EisfFoldersClient({
  initialFolders,
  sitesWithoutFolder,
}: {
  initialFolders: EisfSiteFolder[];
  sitesWithoutFolder: StudySiteWithStudy[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sitePick, setSitePick] = useState<string>('');
  const [msg, setMsg] = useState<string | null>(null);

  const siteLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sitesWithoutFolder) {
      m.set(s.id, `${s.studies?.protocol_number ?? 'Study'} — ${s.name} (${s.site_number})`);
    }
    return m;
  }, [sitesWithoutFolder]);

  const sitePickDisplayLabel = useCallback(
    (value: string | null) => {
      if (value == null || value === '') return null;
      return siteLabelById.get(value) ?? 'Site';
    },
    [siteLabelById]
  );

  const createFolder = () => {
    if (!sitePick) return;
    setMsg(null);
    startTransition(async () => {
      const res = await ensureEisfFolderForSite(sitePick);
      if (!res.success) {
        setMsg(res.error ?? 'Failed');
        return;
      }
      setSitePick('');
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      {sitesWithoutFolder.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-medium">Create a Folder for a Site</h2>
          <p className="text-xs text-muted-foreground">
            Choose a site that does not yet have an eISF folder. Folders are required before uploading site
            documents.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={sitePick} onValueChange={setSitePick}>
              <SelectTrigger className="w-[min(100%,320px)] text-[12px] h-9 min-w-[200px]">
                <SelectValue placeholder="Select Site" getDisplayLabel={sitePickDisplayLabel} />
              </SelectTrigger>
              <SelectContent>
                {sitesWithoutFolder.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-[12px]">
                    {s.studies?.protocol_number ?? 'Study'} — {s.name} ({s.site_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" className="text-[12px]" disabled={!sitePick || pending} onClick={createFolder}>
              Create folder
            </Button>
          </div>
          {msg && <p className="text-xs text-destructive">{msg}</p>}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Study</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Country</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialFolders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-muted-foreground py-8 text-center">
                  No site folders yet. Create one using the form above.
                </TableCell>
              </TableRow>
            ) : (
              initialFolders.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="text-[12px]">
                    {(f.studies as { protocol_number?: string; title?: string } | undefined)?.protocol_number ?? '—'}
                    <span className="text-muted-foreground block text-[11px] truncate max-w-[200px]">
                      {(f.studies as { title?: string } | undefined)?.title}
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px]">
                    {(f.study_sites as { site_number?: string; name?: string } | undefined)?.name ?? '—'}
                    <Badge variant="secondary" className="ml-2 text-[10px] font-normal">
                      #{(f.study_sites as { site_number?: string } | undefined)?.site_number}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">
                    {(f.study_countries as { country_name?: string } | undefined)?.country_name ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm" className="text-[12px]">
                      <Link href={`/protected/eisf/folders/${f.id}`}>Open folder</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
