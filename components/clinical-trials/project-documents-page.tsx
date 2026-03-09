'use client';

import { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { Upload } from 'lucide-react';
import { useCTMS } from './ctms-context';
import { CTMSPageHeader } from './ctms-layout';
import { getClinicalProtocol } from '@/lib/actions/clinical-protocols';

interface ProjectDocumentsPageProps {
  projectId: string;
  embedded?: boolean;
}

export function ProjectDocumentsPage({ projectId, embedded }: ProjectDocumentsPageProps) {
  const { companyId, setSelectedProject } = useCTMS();
  const [loading, setLoading] = useState(true);

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getClinicalProtocol(projectId);
      if (result.success && result.data && !embedded) {
        const p = result.data;
        setSelectedProject({
          id: p.id,
          name: p.title,
          protocol_number: p.protocol_number,
          status: p.status,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, setSelectedProject, embedded]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  const documents: { name: string; type: string; status: string; uploadDate: string; size: string }[] = [];

  return (
    <div className="flex flex-col gap-4">
      {!embedded && <CTMSPageHeader title="Project Documents" />}
      {!embedded && (
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Project Documents</h1>
        <Button variant="default" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>
      )}

      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-medium flex items-center gap-2">Documents</h3>
        </div>
        <div className="px-4 pb-4">
          {documents.length === 0 ? (
            <Empty>
              <EmptyMedia variant="icon">
                <Upload className="h-6 w-6" />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No project documents found</EmptyTitle>
                <EmptyDescription>
                  Upload documents to track regulatory and eTMF files.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 text-xs font-medium">Document Name</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Type</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Status</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Upload Date</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc, i) => (
                  <TableRow key={i} className="hover:bg-muted/50">
                    <TableCell className="text-xs font-medium">{doc.name}</TableCell>
                    <TableCell className="text-xs">{doc.type}</TableCell>
                    <TableCell className="text-xs">{doc.status}</TableCell>
                    <TableCell className="text-xs">{doc.uploadDate}</TableCell>
                    <TableCell className="text-xs">{doc.size}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
