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
import { deleteProtocolContact } from '@/lib/actions/protocol-contacts';
import type { ProtocolContactWithRelations } from '@/lib/actions/protocol-contacts';
import type { ProtocolTeamWithRelations, RegionTeamWithRelations, SiteTeamWithRelations, EntityType } from '@/lib/types/clinical-trials';
import { TEAM_ROLE_LABELS } from '@/lib/types/clinical-trials';
import { CONTACT_PROJECT_ROLE_LABELS } from '@/lib/types/contacts-organizations';

type TeamAssignment = ProtocolTeamWithRelations | RegionTeamWithRelations | SiteTeamWithRelations;
type TeamMemberItem = TeamAssignment | ProtocolContactWithRelations;

function isProtocolContact(item: TeamMemberItem): item is ProtocolContactWithRelations {
  return 'contact_id' in item && 'contact' in item;
}

interface TeamAssignmentsTableProps {
  assignments: TeamMemberItem[];
  entityType: EntityType;
  isLoading: boolean;
  onEdit: (assignment: TeamMemberItem) => void;
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

  const handleDelete = async (item: TeamMemberItem) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    setDeletingId(item.id);

    const result = isProtocolContact(item)
      ? await deleteProtocolContact(item.id)
      : await deleteTeamAssignment(companyId, item.id, entityType);

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

  const getMemberDisplayName = (item: TeamMemberItem) => {
    if (isProtocolContact(item)) {
      const c = item.contact;
      if (!c) return 'Unknown Contact';
      const name = [c.first_name, c.last_name].filter(Boolean).join(' ');
      return name || c.email || 'Unknown Contact';
    }
    const a = item as TeamAssignment;
    if (!a.user) return 'Unknown User';
    const { first_name, last_name, email } = a.user;
    return first_name && last_name ? `${first_name} ${last_name}` : email;
  };

  const getRoleLabel = (item: TeamMemberItem) => {
    const role = item.role;
    if (isProtocolContact(item)) {
      return (CONTACT_PROJECT_ROLE_LABELS as Record<string, string>)[role] ?? role.replace(/_/g, ' ');
    }
    return (TEAM_ROLE_LABELS as Record<string, string>)[role] ?? role;
  };

  const showPrimaryColumn = entityType === 'protocol' && assignments.some((a) => !isProtocolContact(a));

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
            <TableHead className="text-xs">Member</TableHead>
            <TableHead className="text-xs">Role</TableHead>
            <TableHead className="text-xs">Start Date</TableHead>
            <TableHead className="text-xs">End Date</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            {showPrimaryColumn && <TableHead className="text-xs">Primary</TableHead>}
            {canManage && <TableHead className="w-[100px] text-xs">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-xs">
                <div className="flex flex-col">
                  <span className="font-medium">{getMemberDisplayName(item)}</span>
                  {(isProtocolContact(item) ? item.contact?.email : (item as TeamAssignment).user?.email) && (
                    <span className="text-muted-foreground">
                      {isProtocolContact(item) ? item.contact?.email : (item as TeamAssignment).user?.email}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs">
                <Badge variant="outline" className="text-xs">
                  {getRoleLabel(item)}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{formatDate(item.start_date)}</TableCell>
              <TableCell className="text-xs">{formatDate(item.end_date)}</TableCell>
              <TableCell className="text-xs">
                <Badge
                  variant={(item.status === 'active' || item.status === 'pending') ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {item.status === 'active' ? 'Active' : item.status === 'pending' ? 'Pending' : 'Inactive'}
                </Badge>
              </TableCell>
              {showPrimaryColumn && (
                <TableCell className="text-xs">
                  {!isProtocolContact(item) && (item as TeamAssignment).is_primary ? (
                    <Badge variant="default" className="text-xs">
                      Yes
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">{isProtocolContact(item) ? '-' : 'No'}</span>
                  )}
                </TableCell>
              )}
              {canManage && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(item)}
                      className="h-7 px-2"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item)}
                      disabled={deletingId === item.id}
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
