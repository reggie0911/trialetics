'use client';

import { useState } from 'react';
import { Users, Shield, User, Trash2, MoreHorizontal, Loader2 } from 'lucide-react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { UserWithModules, updateUserRole, removeUserFromCompany } from '@/lib/actions/admin';

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
  const [confirmRemove, setConfirmRemove] = useState<UserWithModules | null>(null);

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

  const handleRemoveUser = async (user: UserWithModules) => {
    setConfirmRemove(null);
    setLoadingUserId(user.id);

    try {
      const result = await removeUserFromCompany(user.id, companyId);

      if (result.success) {
        toast({
          title: 'User removed',
          description: `${getUserDisplayName(user)} has been removed from the company`,
        });
        onRefresh();
      } else {
        toast({
          title: 'Failed to remove user',
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
          <CardDescription>
            {users.length} {users.length === 1 ? 'user' : 'users'} in your company
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
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
                      <TableCell className="text-muted-foreground">
                        {user.email || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.modules.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.modules.slice(0, 3).map(mod => (
                              <Badge key={mod.id} variant="outline" className="text-[10px]">
                                {mod.name}
                              </Badge>
                            ))}
                            {user.modules.length > 3 && (
                              <Badge variant="outline" className="text-[10px]">
                                +{user.modules.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
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
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setConfirmRemove(user)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove from Company
                              </DropdownMenuItem>
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

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User from Company?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{confirmRemove && getUserDisplayName(confirmRemove)}</strong> from 
              your company and revoke all their module access. They will no longer be able to access 
              company data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRemove && handleRemoveUser(confirmRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
