'use client';

import { useEffect, useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import {
  getRetentionMilestones,
  deleteRetentionMilestone,
} from '@/lib/actions/patient-engagement';
import type { RetentionMilestone } from '@/lib/types/patient-engagement';
import { RetentionMilestoneDialog } from './retention-milestone-dialog';

interface RetentionMilestoneTableProps {
  companyId: string;
}

export function RetentionMilestoneTable({ companyId }: RetentionMilestoneTableProps) {
  const { toast } = useToast();
  const [milestones, setMilestones] = useState<RetentionMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await getRetentionMilestones(companyId);
    if (res.success && res.data) setMilestones(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId]);

  const handleDelete = async (id: string) => {
    const res = await deleteRetentionMilestone(id);
    if (res.success) {
      toast({ title: 'Milestone deleted' });
      load();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="text-sm font-medium">Retention Milestones</h3>
          <p className="text-xs text-muted-foreground">Define key checkpoints for subject retention</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>Add Milestone</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Visit #</TableHead>
              <TableHead>Expected Day</TableHead>
              <TableHead>Critical</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No milestones defined
                </TableCell>
              </TableRow>
            ) : (
              milestones.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.visit_number ?? '—'}</TableCell>
                  <TableCell>{m.expected_day != null ? `Day ${m.expected_day}` : '—'}</TableCell>
                  <TableCell>
                    {m.is_critical && (
                      <Badge variant="outline" className="bg-red-100 text-red-800">Critical</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(m.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <RetentionMilestoneDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setDialogOpen(false);
          load();
        }}
      />
    </div>
  );
}
