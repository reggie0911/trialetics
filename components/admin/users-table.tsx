'use client';

import { useState } from 'react';
import { Users, Shield, User, MoreHorizontal, Loader2, Ban, CheckCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { UserWithModules, updateUserRole, toggleUserActiveStatus } from '@/lib/actions/admin';

interface UsersTableProps {
  users: UserWithModules[];
  currentUserId: string;
  companyId: string;
  onRefresh: () => void;
}

export function UsersTable({
  users,
  currentUserId,
  companyId,
  onRefresh,
}: UsersTableProps) {
  const { toast } = useToast();
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getUserDisplayName = (user: UserWithModules) => {
    if (user.display_name) return user.display_name;
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email || 'Unknown';
  };

  const handleRoleChange = async (user: UserWithModules, newRole: 'admin' | 'user') => {
    if (user.id === currentUserId) {
      toast({
        title: 'Cannot change own role',
        description: 'You cannot change your own role',
        variant: 'destructive',
      });
      return;
    }

    setLoadingUserId(user.id);

    try {
      const result = await updateUserRole(user.id, newRole, companyId);

      if (result.success) {
        toast({
          title: 'Role updated',
          description: `${getUserDisplayName(user)} is now ${newRole === 'admin' ? 'an admin' : 'a user'}`,
        });
        onRefresh();
      } else {
        toast({
          title: 'Failed to update role',
          description: result.error || 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleToggleActive = async (user: UserWithModules, newStatus: boolean) => {
    if (user.id === currentUserId) {
      toast({
        title: 'Cannot change own status',
        description: 'You cannot deactivate your own account',
        variant: 'destructive',
      });
      return;
    }

    setLoadingUserId(user.id);

    try {
      const result = await toggleUserActiveStatus(user.id, newStatus, companyId);

      if (result.success) {
        toast({
          title: 'Status updated',
          description: `${getUserDisplayName(user)} is now ${newStatus ? 'active' : 'inactive'}`,
        });
        onRefresh();
      } else {
        toast({
          title: 'Failed to update status',
          description: result.error || 'An unexpected error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoadingUserId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Company Users
          </CardTitle>
          <CardDescription className="text-xs">
            {users.length} {users.length === 1 ? 'user' : 'users'} in your company
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs">Active Status</TableHead>
                  <TableHead className="text-xs">Joined</TableHead>
                  <TableHead className="text-xs">Deactivated</TableHead>
                  <TableHead className="w-[50px] text-xs"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-xs">
                        <div className="flex items-center gap-2">
                          {user.role === 'admin' ? (
                            <Shield className="h-4 w-4 text-amber-500" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                          {getUserDisplayName(user)}
                          {user.id === currentUserId && (
                            <Badge variant="secondary" className="text-[10px]">
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {user.email || '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {user.is_active ? (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-xs">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {user.is_active
                          ? '-'
                          : formatDate(user.deactivated_at ?? user.updated_at)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {loadingUserId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : user.id !== currentUserId ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {user.role === 'user' ? (
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(user, 'admin')}
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  Make Admin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleRoleChange(user, 'user')}
                                >
                                  <User className="mr-2 h-4 w-4" />
                                  Make User
                                </DropdownMenuItem>
                              )}
                              {user.is_active ? (
                                <DropdownMenuItem
                                  onClick={() => handleToggleActive(user, false)}
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Deactivate User
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleToggleActive(user, true)}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activate User
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
