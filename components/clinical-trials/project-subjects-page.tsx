'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getClinicalProtocol } from '@/lib/actions/clinical-protocols';
import { getSubjects } from '@/lib/actions/subjects';
import { useCTMS } from './ctms-context';
import { SUBJECT_STATUS_LABELS } from '@/lib/types/clinical-trials';
import type { ClinicalProtocolWithRelations } from '@/lib/types/clinical-trials';
import { Plus, UserCircle, ChevronRight } from 'lucide-react';
import { CTMSPageHeader } from './ctms-layout';

interface ProjectSubjectsPageProps {
  projectId: string;
  embedded?: boolean;
}

export function ProjectSubjectsPage({ projectId, embedded }: ProjectSubjectsPageProps) {
  const { companyId, setSelectedProject } = useCTMS();
  const router = useRouter();
  const [protocol, setProtocol] = useState<ClinicalProtocolWithRelations | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [protocolResult, subjectsResult] = await Promise.all([
        getClinicalProtocol(projectId),
        getSubjects(companyId, { protocol_id: projectId, pageSize: 200 }),
      ]);

      if (protocolResult.success && protocolResult.data) {
        const p = protocolResult.data;
        setProtocol(p);
        if (!embedded) {
          setSelectedProject({
            id: p.id,
            name: p.title,
            protocol_number: p.protocol_number,
            status: p.status,
          });
        }
      }
      if (subjectsResult.success && subjectsResult.data) {
        setSubjects(subjectsResult.data.subjects || []);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, companyId, setSelectedProject, embedded]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRowClick = (subject: any) => {
    const siteId = subject.site_id;
    router.push(`/protected/clinical-trials/project/${projectId}/site/${siteId}/subject/${subject.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading subjects...
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Project not found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!embedded && <CTMSPageHeader title="Project Subjects" subtitle="Subject enrollment and status" />}
      <div className="rounded-md border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            Subjects
          </h3>
          <Button variant="outline" size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Subject
          </Button>
        </div>
        <div className="px-4 pb-4">
          {subjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserCircle className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No subjects enrolled in this project.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-muted/50 text-xs font-medium">Subject #</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Screening #</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Site</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Status</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Enrollment Date</TableHead>
                  <TableHead className="bg-muted/50 text-xs font-medium">Screening Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map((subject) => (
                  <TableRow
                    key={subject.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(subject)}
                  >
                    <TableCell className="text-xs font-medium text-blue-600">
                      {subject.subject_number || subject.screening_number || '-'}
                      <ChevronRight className="h-3 w-3 inline ml-1" />
                    </TableCell>
                    <TableCell className="text-xs">{subject.screening_number || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {subject.site?.site_number || subject.site?.organization?.name || '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {subject.status ? (
                        <Badge variant="outline" className="text-xs">
                          {SUBJECT_STATUS_LABELS[subject.status as keyof typeof SUBJECT_STATUS_LABELS] || subject.status}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{subject.enrollment_date || '-'}</TableCell>
                    <TableCell className="text-xs">{subject.screening_date || '-'}</TableCell>
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
