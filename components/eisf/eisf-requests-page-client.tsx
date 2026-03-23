'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { EisfDocumentRequest, EisfSiteFolder } from '@/lib/types/eisf';

function fmtStatus(s: string) {
  return s.replace(/_/g, ' ');
}

export function EisfRequestsPageClient({
  initialRequests,
  folders,
}: {
  initialRequests: EisfDocumentRequest[];
  folders: EisfSiteFolder[];
}) {
  const folderName = (id: string) => {
    const f = folders.find((x) => x.id === id);
    const site = f?.study_sites as { name?: string; site_number?: string } | undefined;
    return site ? `${site.name} (${site.site_number})` : id.slice(0, 8);
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Folder</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due</TableHead>
            <TableHead className="text-right">Open folder</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initialRequests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-muted-foreground py-8 text-center">
                No requests yet. Open a site folder to create one.
              </TableCell>
            </TableRow>
          ) : (
            initialRequests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-[12px] font-medium">{r.title}</TableCell>
                <TableCell className="text-[12px] text-muted-foreground">{folderName(r.folder_id)}</TableCell>
                <TableCell className="text-[12px]">
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {fmtStatus(r.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-[12px]">{r.due_date ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/protected/eisf/folders/${r.folder_id}`}
                    className="text-[12px] text-primary underline"
                  >
                    Folder
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
