/**
 * Contact Detail Page Client Component
 * Full-page view for contact details with tabs, activity history
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Pencil, User, FileText } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { removeContactFromOrganization } from '@/lib/actions/contacts';
import { updateProtocolContact } from '@/lib/actions/protocol-contacts';
import {
  ContactWithRelations,
  ENTITY_STATUS_LABELS,
} from '@/lib/types/contacts-organizations';
import { ContactFormDialog } from './contact-form-dialog';
import { AssignOrganizationDialog, type EditingOrganizationAssignment } from './assign-organization-dialog';
import { AssignProjectDialog, type EditingProjectAssignment } from './assign-project-dialog';
import { AssignedProjectsCard } from './assigned-projects-card';
import { ActivityTimeline } from './activity-timeline';
import { ContactNotesSheet } from './contact-notes-sheet';
import { EditableContactInfoCard } from './editable-contact-info-card';
import { EditableCredentialsCard } from './editable-credentials-card';
import { EditableProfessionalAssociationCard } from './editable-professional-association-card';
import { EditableNotesCard } from './editable-notes-card';
import { EditableRolesCard } from './editable-roles-card';
import { ContactSocialCard } from './contact-social-card';
import { AssignedOrganizationsCard } from './assigned-organizations-card';
import type { ContactNote } from '@/lib/types/contacts-organizations';

interface ContactDetailPageClientProps {
  contact: ContactWithRelations;
  activities: any[];
  contactNotes?: ContactNote[];
  companyId: string;
  profileId: string;
  userEmail: string;
  userRole?: string;
}

export function ContactDetailPageClient({
  contact: initialContact,
  activities: initialActivities,
  contactNotes = [],
  companyId,
  profileId,
  userEmail,
  userRole = 'user',
}: ContactDetailPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAssignOrg, setShowAssignOrg] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<EditingOrganizationAssignment | null>(null);
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [editingProject, setEditingProject] = useState<EditingProjectAssignment | null>(null);
  const [deactivateProjectConfirm, setDeactivateProjectConfirm] = useState<{ relationshipId: string; name: string } | null>(null);
  const [isDeactivatingProject, setIsDeactivatingProject] = useState(false);
  const [reactivateProjectConfirm, setReactivateProjectConfirm] = useState<{ relationshipId: string; name: string } | null>(null);
  const [isReactivatingProject, setIsReactivatingProject] = useState(false);
  const [showNotesSheet, setShowNotesSheet] = useState(false);
  const [removeOrgConfirm, setRemoveOrgConfirm] = useState<{ relationshipId: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleBack = () => {
    router.push('/protected/contacts-organizations');
  };

  const handleRemoveOrganization = async () => {
    if (!removeOrgConfirm) return;
    
    setIsRemoving(true);
    const result = await removeContactFromOrganization(removeOrgConfirm.relationshipId);
    
    if (result.success) {
      toast({
        title: 'Organization removed',
        description: `Contact has been removed from ${removeOrgConfirm.name}.`,
      });
      router.refresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to remove organization',
        variant: 'destructive',
      });
    }
    
    setIsRemoving(false);
    setRemoveOrgConfirm(null);
  };

  const handleAssignSuccess = () => {
    setEditingOrganization(null);
    router.refresh();
  };

  const handleAssignOrgOpenChange = (open: boolean) => {
    setShowAssignOrg(open);
    if (!open) setEditingOrganization(null);
  };

  const handleEditOrganization = (oc: EditingOrganizationAssignment) => {
    setEditingOrganization(oc);
    setShowAssignOrg(true);
  };

  const handleAssignProjectSuccess = () => {
    setEditingProject(null);
    router.refresh();
  };

  const handleAssignProjectOpenChange = (open: boolean) => {
    setShowAssignProject(open);
    if (!open) setEditingProject(null);
  };

  const handleEditProject = (pc: { id: string; protocol?: { id: string; protocol_number: string | null; title: string | null }; role: string; status: string; start_date?: string | null; end_date?: string | null }) => {
    setEditingProject({ id: pc.id, protocol: pc.protocol, role: pc.role, status: pc.status, start_date: pc.start_date, end_date: pc.end_date });
    setShowAssignProject(true);
  };

  const handleDeactivateProject = async () => {
    if (!deactivateProjectConfirm) return;
    setIsDeactivatingProject(true);
    const result = await updateProtocolContact(deactivateProjectConfirm.relationshipId, {
      status: 'inactive',
      end_date: format(new Date(), 'yyyy-MM-dd'),
    });
    if (result.success) {
      toast({ title: 'Project deactivated', description: `Assignment to ${deactivateProjectConfirm.name} has been deactivated.` });
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to deactivate', variant: 'destructive' });
    }
    setIsDeactivatingProject(false);
    setDeactivateProjectConfirm(null);
  };

  const handleReactivateFromEditDialog = (params: { relationshipId: string; name: string }) => {
    setReactivateProjectConfirm(params);
    setShowAssignProject(false);
    setEditingProject(null);
  };

  const handleReactivateProject = async () => {
    if (!reactivateProjectConfirm) return;
    setIsReactivatingProject(true);
    const result = await updateProtocolContact(reactivateProjectConfirm.relationshipId, {
      status: 'active',
      end_date: null,
    });
    if (result.success) {
      toast({ title: 'Project reactivated', description: `Assignment to ${reactivateProjectConfirm.name} has been reactivated.` });
      router.refresh();
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to reactivate', variant: 'destructive' });
    }
    setIsReactivatingProject(false);
    setReactivateProjectConfirm(null);
  };

  const existingOrgIds = initialContact.organizations?.map((oc) => oc.organization.id) || [];
  const existingProjectIds = (initialContact as any).projects?.map((cp: any) => cp.protocol?.id).filter(Boolean) || [];

  return (
    <>
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        {/* Header with Back button */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={handleBack} className="text-xs md:text-xs" title="Back to Contacts & Organizations">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts & Organizations
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNotesSheet(true)} className="text-xs md:text-xs" title="Notes">
              <FileText className="h-4 w-4 mr-2" />
              Notes
            </Button>
            <Button onClick={() => setShowEditDialog(true)} className="text-xs md:text-xs" title="Edit contact">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        {/* Contact name and badges */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Avatar className="h-10 w-10 shrink-0 rounded-lg after:rounded-lg">
              <AvatarImage src={initialContact.profile_image_url || undefined} alt="" className="rounded-lg" />
              <AvatarFallback className="text-muted-foreground rounded-lg">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <h1 className="text-[32px] font-semibold tracking-[-1px]">
              {initialContact.first_name} {initialContact.last_name}
            </h1>
          </div>
          <div className="flex gap-2 items-center">
            {(initialContact as any).displayTitle && (
              <span className="text-xs md:text-xs text-muted-foreground">
                {(initialContact as any).displayTitle}
              </span>
            )}
            <Badge
              variant={initialContact.status === 'active' ? 'default' : 'secondary'}
              className="text-xs capitalize"
            >
              {ENTITY_STATUS_LABELS[initialContact.status]}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="text-xs md:text-xs">
            <TabsTrigger value="overview" className="text-xs md:text-xs">Overview</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs md:text-xs">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Column 1 */}
              <div className="space-y-4">
                <AssignedOrganizationsCard
                  contact={initialContact}
                  onAssignClick={() => {
                    setEditingOrganization(null);
                    setShowAssignOrg(true);
                  }}
                  onEditClick={handleEditOrganization}
                  onRemoveClick={setRemoveOrgConfirm}
                />
                <AssignedProjectsCard
                  contact={initialContact}
                  onAssignClick={() => {
                    setEditingProject(null);
                    setShowAssignProject(true);
                  }}
                  onEditClick={handleEditProject}
                  onDeactivateClick={setDeactivateProjectConfirm}
                  onReactivateClick={setReactivateProjectConfirm}
                />
                <EditableContactInfoCard contact={initialContact} onSuccess={() => router.refresh()} />
                <EditableCredentialsCard contact={initialContact} onSuccess={() => router.refresh()} />
              </div>

              {/* Column 2 */}
              <div className="space-y-4">
                <EditableProfessionalAssociationCard contact={initialContact} onSuccess={() => router.refresh()} />
                <EditableNotesCard contact={initialContact} onSuccess={() => router.refresh()} />
                <EditableRolesCard
                  contactId={initialContact.id}
                  initialRoleIds={(initialContact as any).roleAssignments?.map((a: any) => a.role_id) ?? []}
                  onSuccess={() => router.refresh()}
                />
                <ContactSocialCard contact={initialContact} onSuccess={() => router.refresh()} />
              </div>

              {/* Column 3 */}
              <div className="space-y-4">
                {/* Primary Organization */}
                {initialContact.primary_organization && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs md:text-xs font-medium">Primary Organization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs md:text-xs space-y-2">
                        <div>
                          <span className="text-muted-foreground">Name: </span>
                          <span className="font-medium">{initialContact.primary_organization.name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Organization Type: </span>
                          <span className="capitalize">{initialContact.primary_organization.organization_type?.replace(/_/g, ' ')}</span>
                        </div>
                        {initialContact.primary_organization.primary_address && (() => {
                          const addr = initialContact.primary_organization.primary_address;
                          return (
                            <>
                              {addr.street_1 && (
                                <div>
                                  <span className="text-muted-foreground">Address: </span>
                                  <span>{addr.street_1}</span>
                                </div>
                              )}
                              {addr.street_2 && (
                                <div>
                                  <span className="text-muted-foreground">Address Line 2: </span>
                                  <span>{addr.street_2}</span>
                                </div>
                              )}
                              {(addr.city || addr.state || addr.postal_code) && (
                                <div>
                                  <span className="text-muted-foreground">City, State, Postal Code: </span>
                                  <span>{[addr.city, addr.state, addr.postal_code].filter(Boolean).join(', ')}</span>
                                </div>
                              )}
                              {addr.country && (
                                <div>
                                  <span className="text-muted-foreground">Country: </span>
                                  <span>{addr.country}</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Profile Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs md:text-xs font-medium">Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs md:text-xs">
                    <div>
                      <span className="text-muted-foreground">Created: </span>
                      <span>{new Date(initialContact.created_at).toLocaleDateString()}</span>
                    </div>
                    {initialContact.creator_email && (
                      <div>
                        <span className="text-muted-foreground">Created by: </span>
                        <span>{initialContact.creator_email}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Last updated: </span>
                      <span>{new Date(initialContact.updated_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-6">
            <ActivityTimeline activities={initialActivities} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Dialog */}
      <ContactFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        contact={initialContact}
        companyId={companyId}
        profileId={profileId}
        userEmail={userEmail}
        userRole={userRole}
        onSuccess={() => {
          setShowEditDialog(false);
          router.refresh();
        }}
      />

      {/* Assign Project Dialog */}
      <AssignProjectDialog
        open={showAssignProject}
        onOpenChange={handleAssignProjectOpenChange}
        onSuccess={handleAssignProjectSuccess}
        contactId={initialContact.id}
        companyId={companyId}
        existingProjectIds={existingProjectIds}
        editingProject={editingProject}
        onReactivate={handleReactivateFromEditDialog}
      />

      {/* Assign Organization Dialog */}
      <AssignOrganizationDialog
        open={showAssignOrg}
        onOpenChange={handleAssignOrgOpenChange}
        contactId={initialContact.id}
        contactName={`${initialContact.first_name} ${initialContact.last_name}`}
        companyId={companyId}
        existingOrganizationIds={existingOrgIds}
        editingAssignment={editingOrganization}
        onSuccess={handleAssignSuccess}
      />

      {/* Deactivate Project Confirmation */}
      <AlertDialog open={!!deactivateProjectConfirm} onOpenChange={() => setDeactivateProjectConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xs md:text-xs">Deactivate Project Assignment</AlertDialogTitle>
            <AlertDialogDescription className="text-xs md:text-xs">
              Are you sure you want to deactivate this contact&apos;s assignment to {deactivateProjectConfirm?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs md:text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs md:text-xs"
              onClick={handleDeactivateProject}
              disabled={isDeactivatingProject}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Project Confirmation */}
      <AlertDialog open={!!reactivateProjectConfirm} onOpenChange={() => setReactivateProjectConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xs md:text-xs">Reactivate Project Assignment</AlertDialogTitle>
            <AlertDialogDescription className="text-xs md:text-xs">
              Are you sure you want to reactivate this contact&apos;s assignment to {reactivateProjectConfirm?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs md:text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs md:text-xs"
              onClick={handleReactivateProject}
              disabled={isReactivatingProject}
            >
              Reactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Organization Confirmation */}
      <AlertDialog open={!!removeOrgConfirm} onOpenChange={() => setRemoveOrgConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xs md:text-xs">Remove Organization</AlertDialogTitle>
            <AlertDialogDescription className="text-xs md:text-xs">
              Are you sure you want to remove this contact from {removeOrgConfirm?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs md:text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs md:text-xs"
              onClick={handleRemoveOrganization}
              disabled={isRemoving}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notes Sheet */}
      <ContactNotesSheet
        open={showNotesSheet}
        onOpenChange={setShowNotesSheet}
        contactId={initialContact.id}
        contactName={`${initialContact.first_name} ${initialContact.last_name}`}
        companyId={companyId}
        profileId={profileId}
        userEmail={userEmail}
        initialNotes={contactNotes}
      />
    </>
  );
}
