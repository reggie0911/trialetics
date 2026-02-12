'use client';

import { useState } from 'react';
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
import { Edit, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteTeamAssignment } from '@/lib/actions/team-assignments';
import type { ProtocolTeamWithRelations, RegionTeamWithRelations, SiteTeamWithRelations, EntityType } from '@/lib/types/clinical-trials';
import { TEAM_ROLE_LABELS } from '@/lib/types/clinical-trials';

type TeamAssignment = ProtocolTeamWithRelations | RegionTeamWithRelations | SiteTeamWithRelations;

interface TeamAssignmentsTableProps {
  assignments: TeamAssignment[];
  entityType: EntityType;
  isLoading: boolean;
  onEdit: (assignment: TeamAssignment) => void;
  onRefresh: () => void;
  companyId: string;
  canManage?: boolean;
}

export function TeamAssignmentsTable({
  assignments,
  entityType,
  isLoading,
  onEdit,
  onRefresh,
  companyId,
  canManage = true,
}: TeamAssignmentsTableProps) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    setDeletingId(id);

    const result = await deleteTeamAssignment(companyId, id, entityType);

    if (result.success) {
      toast({
        title: 'Success',
        description: 'Team member removed successfully',
      });
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to remove team member',
        variant: 'destructive',
      });
    }

    setDeletingId(null);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getUserName = (assignment: TeamAssignment) => {
    if (!assignment.user) return 'Unknown User';
    const { first_name, last_name, email } = assignment.user;
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
    return email;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading team assignments...</div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <UserPlus className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No team members assigned</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">User</TableHead>
            <TableHead className="text-xs">Role</TableHead>
            <TableHead className="text-xs">Start Date</TableHead>
            <TableHead className="text-xs">End Date</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Primary</TableHead>
            {canManage && <TableHead className="w-[100px] text-xs">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((assignment) => (
            <TableRow key={assignment.id}>
              <TableCell className="text-xs">
                <div className="flex flex-col">
                  <span className="font-medium">{getUserName(assignment)}</span>
                  {assignment.user && (
                    <span className="text-muted-foreground">{assignment.user.email}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className="text-xs">
                  {TEAM_ROLE_LABELS[assignment.role]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{formatDate(assignment.start_date)}</TableCell>
              <TableCell className="text-xs">{formatDate(assignment.end_date)}</TableCell>
              <TableCell className="text-xs">
                <Badge
                  variant={assignment.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {assignment.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                {assignment.is_primary ? (
                  <Badge variant="default" className="text-xs">
                    Yes
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">No</span>
                )}
              </TableCell>
              {canManage && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(assignment)}
                      className="h-7 px-2"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(assignment.id)}
                      disabled={deletingId === assignment.id}
                      className="h-7 px-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
