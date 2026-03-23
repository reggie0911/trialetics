'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DocumentStatusBadge } from './document-status-badge';
import type { EtmfDocument } from '@/lib/types/etmf';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface DocumentTableProps {
  documents: EtmfDocument[];
  isPending: boolean;
}

export function DocumentTable({ documents, isPending }: DocumentTableProps) {
  const router = useRouter();

  if (isPending) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Country Name</TableHead>
              <TableHead>Site Name</TableHead>
              <TableHead>Zone Name</TableHead>
              <TableHead>Section Name</TableHead>
              <TableHead>Artifact Name</TableHead>
              <TableHead>Recommended Subartifacts</TableHead>
              <TableHead>Document Name</TableHead>
              <TableHead>Document Status</TableHead>
              <TableHead>Initial Submission</TableHead>
              <TableHead>Document ID</TableHead>
              <TableHead>Version Date</TableHead>
              <TableHead>Version Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                {Array.from({ length: 13 }).map((_, j) => (
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
            <TableHead>Country Name</TableHead>
            <TableHead>Site Name</TableHead>
            <TableHead>Zone Name</TableHead>
            <TableHead>Section Name</TableHead>
            <TableHead>Artifact Name</TableHead>
            <TableHead>Recommended Subartifacts</TableHead>
            <TableHead>Document Name</TableHead>
            <TableHead>Document Status</TableHead>
            <TableHead>Initial Submission</TableHead>
            <TableHead>Document ID</TableHead>
            <TableHead>Version Date</TableHead>
            <TableHead>Version Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc, idx) => (
            <TableRow
              key={doc.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/protected/etmf/library/${doc.id}`)}
            >
              <TableCell>{idx + 1}</TableCell>
              <TableCell>{doc.study_country?.country_name || '-'}</TableCell>
              <TableCell>{doc.site?.name || '-'}</TableCell>
              <TableCell className="max-w-[150px] truncate">
                {doc.tmf_reference?.zone_name || '-'}
              </TableCell>
              <TableCell className="max-w-[150px] truncate">
                {doc.tmf_reference?.section_name || '-'}
              </TableCell>
              <TableCell className="max-w-[150px] truncate">
                {doc.tmf_reference?.artifact_name || '-'}
              </TableCell>
              <TableCell className="max-w-[150px] truncate">
                {doc.tmf_reference?.recommended_sub_artifact || '-'}
              </TableCell>
              <TableCell className="max-w-[200px] truncate font-medium">
                {doc.document_name}
              </TableCell>
              <TableCell>
                <DocumentStatusBadge status={doc.document_status} />
              </TableCell>
              <TableCell>
                {doc.initial_submission_date
                  ? format(new Date(doc.initial_submission_date), 'dd-MMM-yyyy')
                  : '-'}
              </TableCell>
              <TableCell className="font-mono text-xs">
                D-{doc.id.slice(0, 12)}
              </TableCell>
              <TableCell>
                {doc.version_date ? format(new Date(doc.version_date), 'dd-MMM-yyyy') : '-'}
              </TableCell>
              <TableCell>{doc.version_type || '-'}</TableCell>
            </TableRow>
          ))}
          {documents.length === 0 && (
            <TableRow>
              <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                No documents found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
