'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DocumentStatusBadge } from '../library/document-status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { BulkUploadDocument } from '@/lib/types/etmf';
import { format } from 'date-fns';

interface UploadTableProps {
  documents: BulkUploadDocument[];
  isPending: boolean;
}

export function UploadTable({ documents, isPending }: UploadTableProps) {
  if (isPending) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Document Name</TableHead>
              <TableHead>Document ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Creator Name</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Days Since Upload</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead>Document Name</TableHead>
            <TableHead>Document ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Creator Name</TableHead>
            <TableHead>Upload Date</TableHead>
            <TableHead>Days Since Upload</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc, idx) => (
            <TableRow key={doc.id}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell className="max-w-[300px] truncate font-medium">
                {doc.document_name}
              </TableCell>
              <TableCell className="font-mono text-xs">
                D-{doc.id.slice(0, 12)}
              </TableCell>
              <TableCell>
                <DocumentStatusBadge status={doc.document_status} />
              </TableCell>
              <TableCell>{doc.creator_name}</TableCell>
              <TableCell>
                {format(new Date(doc.upload_date), 'dd-MMM-yyyy')}
              </TableCell>
              <TableCell>{doc.days_since_upload} days</TableCell>
            </TableRow>
          ))}
          {documents.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No uploaded documents found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
