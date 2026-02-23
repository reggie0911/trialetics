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
  getRandomizationLists,
  deleteRandomizationList,
} from '@/lib/actions/randomization-supply';
import type { RandomizationList } from '@/lib/types/randomization-supply';
import {
  RANDOMIZATION_METHOD_LABELS,
  LIST_STATUS_LABELS,
} from '@/lib/types/randomization-supply';
import { RandomizationListDialog } from './randomization-list-dialog';

interface RandomizationListTableProps {
  companyId: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  locked: 'bg-yellow-100 text-yellow-800',
  archived: 'bg-blue-100 text-blue-800',
};

export function RandomizationListTable({ companyId }: RandomizationListTableProps) {
  const { toast } = useToast();
  const [lists, setLists] = useState<RandomizationList[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await getRandomizationLists(companyId);
    if (res.success && res.data) setLists(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId]);

  const handleDelete = async (id: string) => {
    const res = await deleteRandomizationList(id);
    if (res.success) {
      toast({ title: 'List deleted' });
      load();
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' });
    }
  };

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="text-sm font-medium">Randomization Lists</h3>
          <p className="text-xs text-muted-foreground">Configure study randomization schemes</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>New List</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Arms</TableHead>
              <TableHead>Block Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No randomization lists configured
                </TableCell>
              </TableRow>
            ) : (
              lists.map((list) => (
                <TableRow key={list.id}>
                  <TableCell className="font-medium">{list.name}</TableCell>
                  <TableCell>{RANDOMIZATION_METHOD_LABELS[list.method]}</TableCell>
                  <TableCell>{list.treatment_arms.join(', ') || '—'}</TableCell>
                  <TableCell>{list.block_size ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[list.status]}>
                      {LIST_STATUS_LABELS[list.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(list.id)}
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

      <RandomizationListDialog
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
