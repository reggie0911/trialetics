/**
 * Organization Detail Page Client Component
 * Full-page view for organization details with tabs, activity history, and map
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Mail, Phone, Globe, MapPin, Building2, Users, FolderOpen, Plus, Trash2 } from 'lucide-react';
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
import { removeOrganizationFromProject } from '@/lib/actions/organizations';
import {
  OrganizationWithRelations,
  ORGANIZATION_TYPE_LABELS,
  ENTITY_STATUS_LABELS,
  CONTACT_ROLE_LABELS,
  ORGANIZATION_PROJECT_ROLE_LABELS,
  ADDRESS_TYPE_LABELS,
} from '@/lib/types/contacts-organizations';
import { OrganizationFormDialog } from './organization-form-dialog';
import { AssignContactDialog } from './assign-contact-dialog';
import { ProjectAssignmentDialog } from './project-assignment-dialog';
import { ActivityTimeline } from './activity-timeline';
import { OrganizationMap } from './organization-map';

interface OrganizationDetailPageClientProps {
  organization: OrganizationWithRelations;
  activities: any[];
  companyId: string;
  profileId: string;
  userEmail: string;
}

export function OrganizationDetailPageClient({
  organization: initialOrg,
  activities: initialActivities,
  companyId,
  profileId,
  userEmail,
}: OrganizationDetailPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAssignContact, setShowAssignContact] = useState(false);
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [removeContactConfirm, setRemoveContactConfirm] = useState<{ relationshipId: string; name: string } | null>(null);
  const [removeProjectConfirm, setRemoveProjectConfirm] = useState<{ relationshipId: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleBack = () => {
    router.push('/protected/contacts-organizations');
  };

  const handleRemoveContact = async () => {
    if (!removeContactConfirm) return;
    
    setIsRemoving(true);
    const result = await removeContactFromOrganization(removeContactConfirm.relationshipId);
    
    if (result.success) {
      toast({
        title: 'Contact removed',
        description: `${removeContactConfirm.name} has been removed from this organization.`,
      });
      router.refresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to remove contact',
        variant: 'destructive',
      });
    }
    
    setIsRemoving(false);
    setRemoveContactConfirm(null);
  };

  const handleRemoveProject = async () => {
    if (!removeProjectConfirm) return;
    
    setIsRemoving(true);
    const result = await removeOrganizationFromProject(removeProjectConfirm.relationshipId);
    
    if (result.success) {
      toast({
        title: 'Project removed',
        description: `Organization has been removed from ${removeProjectConfirm.name}.`,
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

  const existingContactIds = initialOrg.contacts?.map((oc) => oc.contact.id) || [];
  const existingProjectIds = initialOrg.projects?.map((op) => op.project.id) || [];
  const primaryAddress = initialOrg.addresses?.find((addr) => addr.address_type === 'primary');

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

        {/* Organization name and badges */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-[32px] font-semibold tracking-[-1px]">{initialOrg.name}</h1>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs capitalize">
              {ORGANIZATION_TYPE_LABELS[initialOrg.organization_type]}
            </Badge>
            <Badge
              variant={initialOrg.status === 'active' ? 'default' : 'secondary'}
              className="text-xs capitalize"
            >
              {ENTITY_STATUS_LABELS[initialOrg.status]}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="text-xs md:text-xs">
            <TabsTrigger value="overview" className="text-xs md:text-xs">Overview</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs md:text-xs">Activity</TabsTrigger>
            <TabsTrigger value="contacts" className="text-xs md:text-xs">
              Contacts ({initialOrg.contacts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="projects" className="text-xs md:text-xs">
              Projects ({initialOrg.projects?.length || 0})
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
                    {initialOrg.email && (
                      <div className="flex items-center gap-2 text-xs md:text-xs">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${initialOrg.email}`} className="hover:underline">
                          {initialOrg.email}
                        </a>
                      </div>
                    )}
                    {initialOrg.phone && (
                      <div className="flex items-center gap-2 text-xs md:text-xs">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{initialOrg.phone}</span>
                      </div>
                    )}
                    {initialOrg.website && (
                      <div className="flex items-center gap-2 text-xs md:text-xs">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={initialOrg.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {initialOrg.website}
                        </a>
                      </div>
                    )}
                    {!initialOrg.email && !initialOrg.phone && !initialOrg.website && (
                      <p className="text-xs md:text-xs text-muted-foreground">No contact information</p>
                    )}
                  </CardContent>
                </Card>

                {/* Address & Map */}
                {primaryAddress && (
                  <>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-xs md:text-xs font-medium flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs md:text-xs space-y-1">
                          <p>{primaryAddress.street_1}</p>
                          {primaryAddress.street_2 && <p>{primaryAddress.street_2}</p>}
                          <p>
                            {primaryAddress.city}, {primaryAddress.state} {primaryAddress.postal_code}
                          </p>
                          <p>{primaryAddress.country}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Map */}
                    <OrganizationMap organizationName={initialOrg.name} address={primaryAddress} />
                  </>
                )}

                {/* Notes */}
                {initialOrg.notes && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-xs md:text-xs font-medium">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs md:text-xs text-muted-foreground whitespace-pre-wrap">
                        {initialOrg.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Primary Contact */}
                {initialOrg.contacts && initialOrg.contacts.length > 0 && (() => {
                  const primaryContact = initialOrg.contacts.find(c => c.is_primary) || initialOrg.contacts[0];
                  return (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-xs md:text-xs font-medium">Primary Contact</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs md:text-xs">
                          <p className="font-medium">
                            {primaryContact.contact.first_name} {primaryContact.contact.last_name}
                          </p>
                          {primaryContact.contact.title && (
                            <p className="text-muted-foreground">{primaryContact.contact.title}</p>
                          )}
                          {primaryContact.contact.email && (
                            <a href={`mailto:${primaryContact.contact.email}`} className="text-blue-600 hover:underline">
                              {primaryContact.contact.email}
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Profile Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs md:text-xs font-medium">Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs md:text-xs">
                    <div>
                      <span className="text-muted-foreground">Created: </span>
                      <span>{new Date(initialOrg.created_at).toLocaleDateString()}</span>
                    </div>
                    {initialOrg.creator_email && (
                      <div>
                        <span className="text-muted-foreground">Created by: </span>
                        <span>{initialOrg.creator_email}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Last updated: </span>
                      <span>{new Date(initialOrg.updated_at).toLocaleDateString()}</span>
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

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-xs md:text-xs font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assigned Contacts
                </CardTitle>
                <Button
                  onClick={() => setShowAssignContact(true)}
                  size="sm"
                  className="text-xs md:text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Assign Contact
                </Button>
              </CardHeader>
              <CardContent>
                {initialOrg.contacts && initialOrg.contacts.length > 0 ? (
                  <div className="space-y-3">
                    {initialOrg.contacts.map((oc) => (
                      <div key={oc.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex-1 text-xs md:text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">
                              {oc.contact.first_name} {oc.contact.last_name}
                            </p>
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
                            setRemoveContactConfirm({
                              relationshipId: oc.id,
                              name: `${oc.contact.first_name} ${oc.contact.last_name}`,
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
                    No contacts assigned
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
                {initialOrg.projects && initialOrg.projects.length > 0 ? (
                  <div className="space-y-3">
                    {initialOrg.projects.map((op) => (
                      <div key={op.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div className="flex-1 text-xs md:text-xs">
                          <p className="font-medium">
                            {op.project.protocol_number} - {op.project.protocol_name}
                          </p>
                          <p className="text-muted-foreground capitalize">
                            {ORGANIZATION_PROJECT_ROLE_LABELS[op.role]}
                          </p>
                          {(op.start_date || op.end_date) && (
                            <p className="text-muted-foreground">
                              {op.start_date && new Date(op.start_date).toLocaleDateString()}
                              {' - '}
                              {op.end_date ? new Date(op.end_date).toLocaleDateString() : 'Present'}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setRemoveProjectConfirm({
                              relationshipId: op.id,
                              name: `${op.project.protocol_number} - ${op.project.protocol_name}`,
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
      <OrganizationFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        organization={initialOrg}
        companyId={companyId}
        profileId={profileId}
        userEmail={userEmail}
        onSuccess={() => {
          setShowEditDialog(false);
          router.refresh();
        }}
      />

      {/* Assign Contact Dialog */}
      <AssignContactDialog
        open={showAssignContact}
        onOpenChange={setShowAssignContact}
        organizationId={initialOrg.id}
        organizationName={initialOrg.name}
        companyId={companyId}
        existingContactIds={existingContactIds}
        onSuccess={handleAssignSuccess}
      />

      {/* Assign Project Dialog */}
      <ProjectAssignmentDialog
        open={showAssignProject}
        onOpenChange={setShowAssignProject}
        entityType="organization"
        entityId={initialOrg.id}
        entityName={initialOrg.name}
        companyId={companyId}
        existingProjectIds={existingProjectIds}
        onSuccess={handleAssignSuccess}
      />

      {/* Remove Contact Confirmation */}
      <AlertDialog open={!!removeContactConfirm} onOpenChange={() => setRemoveContactConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xs md:text-xs">Remove Contact</AlertDialogTitle>
            <AlertDialogDescription className="text-xs md:text-xs">
              Are you sure you want to remove {removeContactConfirm?.name} from this organization?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs md:text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs md:text-xs"
              onClick={handleRemoveContact}
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
              Are you sure you want to remove this organization from {removeProjectConfirm?.name}?
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
