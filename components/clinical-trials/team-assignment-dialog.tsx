'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { createTeamAssignment, updateTeamAssignment } from '@/lib/actions/team-assignments';
import type { TeamRole, EntityType, ProtocolTeamWithRelations, RegionTeamWithRelations, SiteTeamWithRelations } from '@/lib/types/clinical-trials';
import { TEAM_ROLE_LABELS } from '@/lib/types/clinical-trials';

const teamAssignmentSchema = z.object({
  user_id: z.string().min(1, 'User is required'),
  role: z.string().min(1, 'Role is required'),
  is_primary: z.boolean(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  with_rollup: z.boolean(),
  with_rolldown: z.boolean(),
});

type TeamAssignmentFormData = z.infer<typeof teamAssignmentSchema>;
type TeamAssignment = ProtocolTeamWithRelations | RegionTeamWithRelations | SiteTeamWithRelations;

interface TeamAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  profileId: string;
  email: string;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  assignment?: TeamAssignment | null;
  users: Array<{ id: string; first_name: string | null; last_name: string | null; email: string }>;
  onSuccess: () => void;
}

export function TeamAssignmentDialog({
  open,
  onOpenChange,
  companyId,
  profileId,
  email,
  entityType,
  entityId,
  entityName,
  assignment,
  users,
  onSuccess,
}: TeamAssignmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TeamAssignmentFormData>({
    resolver: zodResolver(teamAssignmentSchema),
    defaultValues: {
      user_id: '',
      role: '',
      is_primary: false,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      status: 'active',
      with_rollup: false,
      with_rolldown: false,
    },
  });

  useEffect(() => {
    if (assignment) {
      form.reset({
        user_id: assignment.user_id,
        role: assignment.role,
        is_primary: assignment.is_primary,
        start_date: assignment.start_date,
        end_date: assignment.end_date || '',
        status: assignment.status,
        with_rollup: false,
        with_rolldown: false,
      });
    } else {
      form.reset({
        user_id: '',
        role: '',
        is_primary: false,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        status: 'active',
        with_rollup: false,
        with_rolldown: false,
      });
    }
  }, [assignment]);

  const onSubmit = async (data: TeamAssignmentFormData) => {
    setIsSubmitting(true);

    try {
      let result;

      if (assignment) {
        // Update existing assignment
        result = await updateTeamAssignment(companyId, profileId, email, {
          id: assignment.id,
          entity_type: entityType,
          is_primary: data.is_primary,
          end_date: data.end_date || null,
          status: data.status,
        });
      } else {
        // Create new assignment
        result = await createTeamAssignment(companyId, profileId, email, {
          entity_type: entityType,
          entity_id: entityId,
          user_id: data.user_id,
          role: data.role as TeamRole,
          is_primary: data.is_primary,
          start_date: data.start_date,
          end_date: data.end_date || null,
          status: data.status,
          with_rollup: data.with_rollup,
          with_rolldown: data.with_rolldown,
        });
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: assignment ? 'Team assignment updated successfully' : 'Team member assigned successfully',
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save team assignment',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving team assignment:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showRollupOption = entityType === 'site' || entityType === 'region';
  const showRolldownOption = entityType === 'protocol' || entityType === 'region';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {assignment ? 'Edit Team Assignment' : 'Assign Team Member'}
          </DialogTitle>
          {entityName && (
            <DialogDescription className="text-xs">
              {entityType.charAt(0).toUpperCase() + entityType.slice(1)}: {entityName}
            </DialogDescription>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      User <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!!assignment}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id} className="text-xs">
                            {user.first_name && user.last_name
                              ? `${user.first_name} ${user.last_name}`
                              : user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Role <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!!assignment}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TEAM_ROLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value} className="text-xs">
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Start Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        {...field}
                        disabled={!!assignment}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-8 text-xs"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Status <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active" className="text-xs">Active</SelectItem>
                        <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_primary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-6">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-xs font-normal">
                      Primary Role
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {!assignment && (showRollupOption || showRolldownOption) && (
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-xs font-medium">Cascade Options</p>
                
                {showRolldownOption && (
                  <FormField
                    control={form.control}
                    name="with_rolldown"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-xs font-normal">
                            Rolldown to child entities
                          </FormLabel>
                          <FormDescription className="text-xs">
                            {entityType === 'protocol' 
                              ? 'Assign to all regions and sites under this protocol'
                              : 'Assign to all sites under this region'}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                {showRollupOption && (
                  <FormField
                    control={form.control}
                    name="with_rollup"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-xs font-normal">
                            Rollup to parent entities
                          </FormLabel>
                          <FormDescription className="text-xs">
                            {entityType === 'site'
                              ? 'Assign to parent region and protocol'
                              : 'Assign to parent protocol'}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-8 text-xs">
                {isSubmitting ? 'Saving...' : assignment ? 'Update' : 'Assign'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
