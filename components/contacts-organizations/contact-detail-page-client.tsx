/**
 * Contact Detail Page Client Component
 * Full-page view for contact details with tabs, activity history
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Mail, Phone, User, Users, FolderOpen, Plus, Trash2, Award } from 'lucide-react';
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
import { removeContactFromOrganization, removeContactFromProject } from '@/lib/actions/contacts';
import { formatFieldName } from '@/lib/utils';
import {
  ContactWithRelations,
  ENTITY_STATUS_LABELS,
  CONTACT_ROLE_LABELS,
  CONTACT_PROJECT_ROLE_LABELS,
} from '@/lib/types/contacts-organizations';
import { ContactFormDialog } from './contact-form-dialog';
import { AssignOrganizationDialog } from './assign-organization-dialog';
import { ProjectAssignmentDialog } from './project-assignment-dialog';
import { ActivityTimeline } from './activity-timeline';

interface ContactDetailPageClientProps {
  contact: ContactWithRelations;
  activities: any[];
  companyId: string;
  profileId: string;
  userEmail: string;
  userRole?: string;
}

export function ContactDetailPageClient({
  contact: initialContact,
  activities: initialActivities,
  companyId,
  profileId,
  userEmail,
  userRole = 'user',
}: ContactDetailPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAssignOrg, setShowAssignOrg] = useState(false);
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [removeOrgConfirm, setRemoveOrgConfirm] = useState<{ relationshipId: string; name: string } | null>(null);
  const [removeProjectConfirm, setRemoveProjectConfirm] = useState<{ relationshipId: string; name: string } | null>(null);
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

  const handleRemoveProject = async () => {
    if (!removeProjectConfirm) return;
    
    setIsRemoving(true);
    const result = await removeContactFromProject(removeProjectConfirm.relationshipId);
    
    if (result.success) {
      toast({
        title: 'Project removed',
        description: `Contact has been removed from ${removeProjectConfirm.name}.`,
      });
      router.refresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to remove from project',
        variant: 'destructive',
      });
    }
    
    setIsRemoving(false);
    setRemoveProjectConfirm(null);
  };

  const handleAssignSuccess = () => {
    router.refresh();
  };

  const existingOrgIds = initialContact.organizations?.map((oc) => oc.organization.id) || [];
  const existingProjectIds = initialContact.projects?.map((cp) => cp.protocol.id) || [];

  return (
    <>
      <main className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-4 sm:py-8">
        {/* Header with Back button */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={handleBack} className="text-xs md:text-xs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts & Organizations
          </Button>
          <Button onClick={() => setShowEditDialog(true)} className="text-xs md:text-xs">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>

        {/* Contact name and badges */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <User className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-[32px] font-semibold tracking-[-1px]">
              {initialContact.first_name} {initialContact.last_name}
            </h1>
          </div>
          <div className="flex gap-2 items-center">
            {initialContact.title && (
              <span className="text-xs md:text-xs text-muted-foreground">
                {CONTACT_ROLE_LABELS[initialContact.title as keyof typeof CONTACT_ROLE_LABELS] || formatFieldName(initialContact.title)}
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
            <TabsTrigger value="organizations" className="text-xs md:text-xs">
              Organizations ({initialContact.organizations?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs md:text-xs">
              Projects ({initialContact.projects?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Contact Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs md:text-xs font-medium">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {initialContact.email && (
                      <div className="flex items-center gap-2 text-xs md:text-xs">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${initialContact.email}`} className="hover:underline">
                          {initialContact.email}
                        </a>
                      </div>
                    )}
                    {initialContact.phone && (
                      <div className="flex items-center gap-2 text-xs md:text-xs">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{initialContact.phone}</span>
                      </div>
                    )}
                    {!initialContact.email && !initialContact.phone && (
                      <p className="text-xs md:text-xs text-muted-foreground">No contact information</p>
                    )}
                  </CardContent>
                </Card>

                {/* Credentials */}
                {(initialContact.credentials || initialContact.license_number) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs md:text-xs font-medium flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Credentials
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs md:text-xs">
                      {initialContact.credentials && (
                        <div>
                          <span className="text-muted-foreground">Credentials: </span>
                          <span className="font-medium">{initialContact.credentials}</span>
                        </div>
                      )}
                      {initialContact.license_number && (
                        <div>
                          <span className="text-muted-foreground">License Number: </span>
                          <span className="font-medium">{initialContact.license_number}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {initialContact.notes && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs md:text-xs font-medium">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs md:text-xs text-muted-foreground whitespace-pre-wrap">
                        {initialContact.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Primary Organization */}
                {initialContact.primary_organization && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs md:text-xs font-medium">Primary Organization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs md:text-xs">
                        <p className="font-medium">{initialContact.primary_organization.name}</p>
                        <p className="text-muted-foreground capitalize">
                          {initialContact.primary_organization.organization_type}
                        </p>
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

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-xs md:text-xs font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assigned Organizations
                </CardTitle>
                <Button
                  onClick={() => setShowAssignOrg(true)}
                  size="sm"
                  className="text-xs md:text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Assign Organization
                </Button>
              </CardHeader>
              <CardContent>
                {initialContact.organizations && initialContact.organizations.length > 0 ? (
                  <div className="space-y-3">
                    {initialContact.organizations.map((oc) => (
                      <div key={oc.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex-1 text-xs md:text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{oc.organization.name}</p>
                            {oc.is_primary && (
                              <Badge variant="default" className="text-[10px]">Primary</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground capitalize">
                            {CONTACT_ROLE_LABELS[oc.role]}
                          </p>
                          {(oc.start_date || oc.end_date) && (
                            <p className="text-muted-foreground">
                              {oc.start_date && new Date(oc.start_date).toLocaleDateString()}
                              {' - '}
                              {oc.end_date ? new Date(oc.end_date).toLocaleDateString() : 'Present'}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setRemoveOrgConfirm({
                              relationshipId: oc.id,
                              name: oc.organization.name,
                            })
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs md:text-xs text-muted-foreground text-center py-6">
                    No organizations assigned
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-xs md:text-xs font-medium flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Assigned Projects
                </CardTitle>
                <Button
                  onClick={() => setShowAssignProject(true)}
                  size="sm"
                  className="text-xs md:text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Assign Project
                </Button>
              </CardHeader>
              <CardContent>
                {initialContact.projects && initialContact.projects.length > 0 ? (
                  <div className="space-y-3">
                    {initialContact.projects.map((cp) => (
                      <div key={cp.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex-1 text-xs md:text-xs">
                          <p className="font-medium">
                            {cp.protocol.protocol_number} - {cp.protocol.title}
                          </p>
                          <p className="text-muted-foreground capitalize">
                            {CONTACT_PROJECT_ROLE_LABELS[cp.role]}
                          </p>
                          {cp.organization && (
                            <p className="text-muted-foreground">at {cp.organization.name}</p>
                          )}
                          {(cp.start_date || cp.end_date) && (
                            <p className="text-muted-foreground">
                              {cp.start_date && new Date(cp.start_date).toLocaleDateString()}
                              {' - '}
                              {cp.end_date ? new Date(cp.end_date).toLocaleDateString() : 'Present'}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setRemoveProjectConfirm({
                              relationshipId: cp.id,
                              name: `${cp.protocol.protocol_number} - ${cp.protocol.title}`,
                            })
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs md:text-xs text-muted-foreground text-center py-6">
                    No projects assigned
                  </p>
                )}
              </CardContent>
            </Card>
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

      {/* Assign Organization Dialog */}
      <AssignOrganizationDialog
        open={showAssignOrg}
        onOpenChange={setShowAssignOrg}
        contactId={initialContact.id}
        contactName={`${initialContact.first_name} ${initialContact.last_name}`}
        companyId={companyId}
        existingOrganizationIds={existingOrgIds}
        onSuccess={handleAssignSuccess}
      />

      {/* Assign Project Dialog */}
      <ProjectAssignmentDialog
        open={showAssignProject}
        onOpenChange={setShowAssignProject}
        entityType="contact"
        entityId={initialContact.id}
        entityName={`${initialContact.first_name} ${initialContact.last_name}`}
        companyId={companyId}
        existingProjectIds={existingProjectIds}
        onSuccess={handleAssignSuccess}
      />

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

      {/* Remove Project Confirmation */}
      <AlertDialog open={!!removeProjectConfirm} onOpenChange={() => setRemoveProjectConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xs md:text-xs">Remove Project</AlertDialogTitle>
            <AlertDialogDescription className="text-xs md:text-xs">
              Are you sure you want to remove this contact from {removeProjectConfirm?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs md:text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs md:text-xs"
              onClick={handleRemoveProject}
              disabled={isRemoving}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
