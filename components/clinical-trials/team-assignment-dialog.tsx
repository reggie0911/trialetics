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
import { createProtocolContact, updateProtocolContact } from '@/lib/actions/protocol-contacts';
import type { ProtocolContactWithRelations } from '@/lib/actions/protocol-contacts';
import type { ProtocolContactRole } from '@/lib/actions/protocol-contacts';
import { ContactPicker } from '@/components/contacts-organizations/contact-picker';
import { CONTACT_PROJECT_ROLE_LABELS } from '@/lib/types/contacts-organizations';
import type { TeamRole, EntityType, ProtocolTeamWithRelations, RegionTeamWithRelations, SiteTeamWithRelations } from '@/lib/types/clinical-trials';
import { TEAM_ROLE_LABELS } from '@/lib/types/clinical-trials';

const PROTOCOL_CONTACT_ROLES: ProtocolContactRole[] = [
  'principal_investigator', 'sub_investigator', 'coordinator', 'site_staff',
  'sponsor_rep', 'cro_rep', 'medical_monitor', 'project_manager', 'data_manager',
  'regulatory_lead', 'qa_lead', 'lab_director', 'finance', 'contracts', 'other',
];

const teamAssignmentSchema = z.object({
  user_id: z.string().optional(),
  contact_id: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  is_primary: z.boolean(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  with_rollup: z.boolean(),
  with_rolldown: z.boolean(),
}).refine((data) => data.user_id || data.contact_id, {
  message: 'User or contact is required',
  path: ['user_id'],
});

type TeamAssignmentFormData = z.infer<typeof teamAssignmentSchema>;
type TeamAssignment = ProtocolTeamWithRelations | RegionTeamWithRelations | SiteTeamWithRelations;
type AssignmentOrContact = TeamAssignment | ProtocolContactWithRelations;

function isProtocolContact(a: AssignmentOrContact | null | undefined): a is ProtocolContactWithRelations {
  return !!a && 'contact_id' in a && 'contact' in a;
}

interface TeamAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  profileId: string;
  email: string;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  assignment?: AssignmentOrContact | null;
  users?: Array<{ id: string; first_name: string | null; last_name: string | null; email: string }>;
  excludeContactIds?: string[];
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
  excludeContactIds,
  onSuccess,
}: TeamAssignmentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Protocol-level: use contact picker; region/site: use user picker
  const useContacts = entityType === 'protocol';
  const editingProtocolContact = useContacts && isProtocolContact(assignment);

  const form = useForm<TeamAssignmentFormData>({
    resolver: zodResolver(teamAssignmentSchema),
    defaultValues: {
      user_id: '',
      contact_id: '',
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
    if (!open) return;
    if (assignment) {
      if (isProtocolContact(assignment)) {
        form.reset({
          user_id: '',
          contact_id: assignment.contact_id,
          role: assignment.role,
          is_primary: false,
          start_date: assignment.start_date || new Date().toISOString().split('T')[0],
          end_date: assignment.end_date || '',
          status: (assignment.status === 'pending' ? 'active' : assignment.status) as 'active' | 'inactive',
          with_rollup: false,
          with_rolldown: false,
        });
      } else {
        const a = assignment as TeamAssignment;
        form.reset({
          user_id: a.user_id,
          contact_id: '',
          role: a.role,
          is_primary: a.is_primary,
          start_date: a.start_date,
          end_date: a.end_date || '',
          status: a.status,
          with_rollup: false,
          with_rolldown: false,
        });
      }
    } else {
      form.reset({
        user_id: '',
        contact_id: '',
        role: '',
        is_primary: false,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        status: 'active',
        with_rollup: false,
        with_rolldown: false,
      });
    }
  }, [assignment, open]);

  const onSubmit = async (data: TeamAssignmentFormData) => {
    setIsSubmitting(true);
    try {
      let result;

      if (useContacts) {
        if (editingProtocolContact) {
          result = await updateProtocolContact((assignment as ProtocolContactWithRelations).id, {
            role: data.role as ProtocolContactRole,
            status: data.status as 'active' | 'inactive',
            start_date: data.start_date || null,
            end_date: data.end_date || null,
          });
        } else {
          result = await createProtocolContact({
            protocol_id: entityId,
            contact_id: data.contact_id!,
            role: data.role as ProtocolContactRole,
            status: data.status as 'active' | 'inactive',
            start_date: data.start_date || null,
            end_date: data.end_date || null,
          });
        }
      } else if (assignment && !isProtocolContact(assignment)) {
        result = await updateTeamAssignment(companyId, profileId, email, {
          id: (assignment as TeamAssignment).id,
          entity_type: entityType,
          is_primary: data.is_primary,
          end_date: data.end_date || null,
          status: data.status,
        });
      } else {
        result = await createTeamAssignment(companyId, profileId, email, {
          entity_type: entityType,
          entity_id: entityId,
          user_id: data.user_id!,
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
          description: assignment ? 'Team member updated successfully' : 'Team member assigned successfully',
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving team assignment:', error);
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showRollupOption = !useContacts && (entityType === 'site' || entityType === 'region');
  const showRolldownOption = !useContacts && entityType === 'region';

  // Display name for the contact being edited
  const editingContactName = editingProtocolContact && assignment && 'contact' in assignment && assignment.contact
    ? [assignment.contact.first_name, assignment.contact.last_name].filter(Boolean).join(' ') || assignment.contact.email
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {assignment ? 'Edit Team Member' : 'Assign Team Member'}
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
              {useContacts ? (
                <FormField
                  control={form.control}
                  name="contact_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Contact <span className="text-destructive">*</span>
                      </FormLabel>
                      {editingProtocolContact ? (
                        // Editing an existing contact-based assignment — show static name
                        <div className="flex h-8 items-center rounded-md border border-input bg-muted/50 px-3 text-xs text-muted-foreground">
                          {editingContactName || 'Unknown Contact'}
                        </div>
                      ) : assignment && !isProtocolContact(assignment) ? (
                        // Editing an existing user-based assignment at protocol level — show user name
                        <div className="flex h-8 items-center rounded-md border border-input bg-muted/50 px-3 text-xs text-muted-foreground">
                          {(() => {
                            const a = assignment as TeamAssignment & { user?: { first_name: string | null; last_name: string | null; email: string } };
                            const u = a.user ?? (users || []).find((usr) => usr.id === a.user_id);
                            return u
                              ? (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email)
                              : a.user_id;
                          })()}
                        </div>
                      ) : (
                        // Adding a new contact assignment
                        <FormControl>
                          <ContactPicker
                            companyId={companyId}
                            value={field.value || ''}
                            onChange={field.onChange}
                            excludeIds={excludeContactIds ?? []}
                            placeholder="Select contact"
                          />
                        </FormControl>
                      )}
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        User <span className="text-destructive">*</span>
                      </FormLabel>
                      {assignment && !isProtocolContact(assignment) ? (
                        <div className="flex h-8 items-center rounded-md border border-input bg-muted/50 px-3 text-xs text-muted-foreground">
                          {(() => {
                            const a = assignment as TeamAssignment & { user?: { first_name: string | null; last_name: string | null; email: string } };
                            const u = a.user ?? (users || []).find((usr) => usr.id === a.user_id);
                            return u
                              ? (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email)
                              : a.user_id;
                          })()}
                        </div>
                      ) : (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!!assignment}
                          items={[
                            { value: '', label: 'Select user' },
                            ...(users || []).map((u) => ({
                              value: u.id,
                              label: u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email,
                            })),
                          ]}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue
                                placeholder="Select user"
                                getDisplayLabel={(v) => {
                                  if (!v) return null;
                                  const u = (users || []).find((x) => x.id === v);
                                  return u
                                    ? (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email)
                                    : null;
                                }}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(users || []).map((user) => (
                              <SelectItem key={user.id} value={user.id} className="text-xs">
                                {user.first_name && user.last_name
                                  ? `${user.first_name} ${user.last_name}`
                                  : user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => {
                  // Look up in both label maps for maximum compatibility
                  const roleLabel =
                    (CONTACT_PROJECT_ROLE_LABELS as Record<string, string>)[field.value] ??
                    (TEAM_ROLE_LABELS as Record<string, string>)[field.value] ??
                    field.value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Role <span className="text-destructive">*</span>
                      </FormLabel>
                      {(editingProtocolContact || (assignment && !isProtocolContact(assignment))) ? (
                        // Show static label when editing any existing assignment
                        <div className="flex h-8 items-center rounded-md border border-input bg-muted/50 px-3 text-xs text-muted-foreground">
                          {roleLabel || 'Unknown Role'}
                        </div>
                      ) : (
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={!useContacts && !!assignment}
                          items={[
                            { value: '', label: 'Select role' },
                            ...(useContacts ? PROTOCOL_CONTACT_ROLES : Object.keys(TEAM_ROLE_LABELS)).map((v) => ({
                              value: v,
                              label: useContacts
                                ? (CONTACT_PROJECT_ROLE_LABELS[v as keyof typeof CONTACT_PROJECT_ROLE_LABELS] ?? v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
                                : (TEAM_ROLE_LABELS[v as keyof typeof TEAM_ROLE_LABELS] ?? v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())),
                            })),
                          ]}
                        >
                          <FormControl>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue
                                placeholder="Select role"
                                getDisplayLabel={(v) =>
                                  v
                                    ? (CONTACT_PROJECT_ROLE_LABELS as Record<string, string>)[v] ??
                                      (TEAM_ROLE_LABELS as Record<string, string>)[v] ??
                                      v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                                    : null
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(useContacts ? PROTOCOL_CONTACT_ROLES : Object.keys(TEAM_ROLE_LABELS)).map((value) => (
                              <SelectItem key={value} value={value} className="text-xs">
                                {useContacts
                                  ? (CONTACT_PROJECT_ROLE_LABELS as Record<string, string>)[value] ?? value
                                  : (TEAM_ROLE_LABELS as Record<string, string>)[value] ?? value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage className="text-xs" />
                    </FormItem>
                  );
                }}
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
                        disabled={!!(assignment && !editingProtocolContact)}
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
                      <Input type="date" className="h-8 text-xs" {...field} />
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
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      items={[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                      ]}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue
                            placeholder="Select status"
                            getDisplayLabel={(v) =>
                              v === 'active' ? 'Active' : v === 'inactive' ? 'Inactive' : null
                            }
                          />
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

              {!useContacts && (
                <FormField
                  control={form.control}
                  name="is_primary"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-6">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="text-xs font-normal">Primary Role</FormLabel>
                    </FormItem>
                  )}
                />
              )}
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
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-xs font-normal">Rolldown to child entities</FormLabel>
                          <FormDescription className="text-xs">
                            Assign to all sites under this region
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
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-xs font-normal">Rollup to parent entities</FormLabel>
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
