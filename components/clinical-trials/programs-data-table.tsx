'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { PROTOCOL_STATUS_LABELS } from '@/lib/types/clinical-trials';
import type { ClinicalProgramWithRelations } from '@/lib/types/clinical-trials';
import { deleteClinicalProgram } from '@/lib/actions/clinical-programs';
import { useToast } from '@/hooks/use-toast';

interface ProgramsDataTableProps {
  programs: ClinicalProgramWithRelations[];
  isLoading: boolean;
  onEdit: (program: ClinicalProgramWithRelations) => void;
  onRefresh: () => void;
  companyId: string;
}

export function ProgramsDataTable({
  programs,
  isLoading,
  onEdit,
  onRefresh,
}: ProgramsDataTableProps) {
  const { toast } = useToast();

  const handleDelete = async (programId: string) => {
    if (!confirm('Are you sure you want to delete this program?')) return;

    const result = await deleteClinicalProgram(programId);
    if (result.success) {
      toast({
        title: 'Success',
        description: 'Program deleted successfully',
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to delete program',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <div className="text-center text-sm text-muted-foreground">Loading...</div>;
  }

  if (programs.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground">
        No programs found. Click "Add Program" to create one.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Program Name</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Protocols</TableHead>
            <TableHead className="text-xs">Description</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {programs.map((program) => (
            <TableRow key={program.id}>
              <TableCell className="text-xs font-medium">{program.name}</TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className="text-xs">
                  {PROTOCOL_STATUS_LABELS[program.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{program.protocols_count || 0}</TableCell>
              <TableCell className="text-xs">
                {program.description ? (
                  <span className="line-clamp-1">{program.description}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger className="h-6 w-6 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground outline-none">
                    <MoreHorizontal className="h-3 w-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(program)}>
                      <Edit className="mr-2 h-3 w-3" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(program.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-3 w-3" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
