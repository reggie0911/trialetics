'use client';

import { useState, useEffect } from 'react';
import { Loader2, Building2, Mail, Phone, Globe, Users, FolderOpen, Pencil, MapPin, Plus, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import { getOrganization } from '@/lib/actions/organizations';
import { removeContactFromOrganization } from '@/lib/actions/contacts';
import { removeOrganizationFromProject } from '@/lib/actions/organizations';
import {
  OrganizationWithRelations,
  ORGANIZATION_TYPE_LABELS,
  ENTITY_STATUS_LABELS,
  CONTACT_ROLE_LABELS,
  ORGANIZATION_PROJECT_ROLE_LABELS,
} from '@/lib/types/contacts-organizations';
import { AssignContactDialog } from './assign-contact-dialog';
import { ProjectAssignmentDialog } from './project-assignment-dialog';

interface OrganizationDetailSheetProps {
  organization: OrganizationWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onRefresh: () => void;
  companyId: string;
}

export function OrganizationDetailSheet({
  organization: initialOrg,
  open,
  onOpenChange,
  onEdit,
  onRefresh,
  companyId,
}: OrganizationDetailSheetProps) {
  const { toast } = useToast();
  const [organization, setOrganization] = useState<OrganizationWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAssignContact, setShowAssignContact] = useState(false);
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [removeContactConfirm, setRemoveContactConfirm] = useState<{ relationshipId: string; name: string } | null>(null);
  const [removeProjectConfirm, setRemoveProjectConfirm] = useState<{ relationshipId: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (open && initialOrg) {
      loadFullOrganization(initialOrg.id);
    }
  }, [open, initialOrg]);

  const loadFullOrganization = async (id: string) => {
    setIsLoading(true);
    const result = await getOrganization(id);
    if (result.success && result.data) {
      setOrganization(result.data);
    }
    setIsLoading(false);
  };

  const handleRemoveContact = async () => {
    if (!removeContactConfirm || !organization) return;
    
    setIsRemoving(true);
    const result = await removeContactFromOrganization(removeContactConfirm.relationshipId);
    
    if (result.success) {
      toast({
        title: 'Contact removed',
        description: `${removeContactConfirm.name} has been removed from this organization.`,
      });
      loadFullOrganization(organization.id);
      onRefresh();
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
    if (!removeProjectConfirm || !organization) return;
    
    setIsRemoving(true);
    const result = await removeOrganizationFromProject(removeProjectConfirm.relationshipId);
    
    if (result.success) {
      toast({
        title: 'Project removed',
        description: `Organization has been removed from ${removeProjectConfirm.name}.`,
      });
      loadFullOrganization(organization.id);
      onRefresh();
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
    if (organization) {
      loadFullOrganization(organization.id);
    }
    onRefresh();
  };

  if (!initialOrg) return null;

  const existingContactIds = organization?.contacts?.map((oc) => oc.contact.id) || [];
  const existingProjectIds = organization?.projects?.map((op) => op.protocol.id) || [];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto p-6">
          <SheetHeader>
            <SheetTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {initialOrg.name}
            </SheetTitle>
            <SheetDescription className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {ORGANIZATION_TYPE_LABELS[initialOrg.organization_type]}
              </Badge>
              <Badge
                variant={initialOrg.status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {ENTITY_STATUS_LABELS[initialOrg.status]}
              </Badge>
            </SheetDescription>
          </SheetHeader>

          <Separator className="my-4" />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
                <TabsTrigger value="contacts" className="text-xs">
                  Contacts ({organization?.contacts?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="projects" className="text-xs">
                  Projects ({organization?.projects?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 space-y-4">
                {/* Contact Information */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {initialOrg.email && (
                      <div className="flex items-center gap-2 text-xs">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <a href={`mailto:${initialOrg.email}`} className="hover:underline">
                          {initialOrg.email}
                        </a>
                      </div>
                    )}
                    {initialOrg.phone && (
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <a href={`tel:${initialOrg.phone}`} className="hover:underline">
                          {initialOrg.phone}
                        </a>
                      </div>
                    )}
                    {initialOrg.website && (
                      <div className="flex items-center gap-2 text-xs">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <a
                          href={initialOrg.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {initialOrg.website}
                        </a>
                      </div>
                    )}
                    {!initialOrg.email && !initialOrg.phone && !initialOrg.website && (
                      <p className="text-xs text-muted-foreground">No contact information provided.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Address */}
                {organization?.addresses && organization.addresses.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium">Address</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {organization.addresses.map((address) => (
                        <div key={address.id} className="flex items-start gap-2 text-xs">
                          <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                          <div>
                            {address.street_1 && <div>{address.street_1}</div>}
                            {address.street_2 && <div>{address.street_2}</div>}
                            <div>
                              {[address.city, address.state, address.postal_code]
                                .filter(Boolean)
                                .join(', ')}
                            </div>
                            {address.country && <div>{address.country}</div>}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {initialOrg.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {initialOrg.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium">Record Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Created</span>
                      <span>{new Date(initialOrg.created_at).toLocaleDateString()}</span>
                    </div>
                    {initialOrg.creator_email && (
                      <div className="flex justify-between">
                        <span>Created by</span>
                        <span>{initialOrg.creator_email}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Last updated</span>
                      <span>{new Date(initialOrg.updated_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contacts" className="mt-4">
                <div className="flex justify-end mb-3">
                  <Button
                    size="sm"
                    onClick={() => setShowAssignContact(true)}
                    className="text-xs h-7"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Contact
                  </Button>
                </div>
                {organization?.contacts && organization.contacts.length > 0 ? (
                  <div className="space-y-2">
                    {organization.contacts.map((oc) => (
                      <Card key={oc.id} className="p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-xs">
                                {oc.contact.first_name} {oc.contact.last_name}
                                {oc.contact.credentials && (
                                  <span className="text-muted-foreground">, {oc.contact.credentials}</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {CONTACT_ROLE_LABELS[oc.role]}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {oc.is_primary && (
                              <Badge variant="secondary" className="text-xs h-5">Primary</Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => setRemoveContactConfirm({
                                relationshipId: oc.id,
                                name: `${oc.contact.first_name} ${oc.contact.last_name}`,
                              })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">No contacts assigned.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="projects" className="mt-4">
                <div className="flex justify-end mb-3">
                  <Button
                    size="sm"
                    onClick={() => setShowAssignProject(true)}
                    className="text-xs h-7"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Assign to Project
                  </Button>
                </div>
                {organization?.projects && organization.projects.length > 0 ? (
                  <div className="space-y-2">
                    {organization.projects.map((op) => (
                      <Card key={op.id} className="p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-xs">{op.protocol.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {op.protocol.protocol_number} • {ORGANIZATION_PROJECT_ROLE_LABELS[op.role]}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => setRemoveProjectConfirm({
                              relationshipId: op.id,
                              name: op.protocol.title,
                            })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <FolderOpen className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">No projects assigned.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Edit Button at Bottom */}
          <div className="mt-6 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={onEdit} className="text-xs w-full">
              <Pencil className="mr-2 h-3 w-3" />
              Edit Organization
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Assign Contact Dialog */}
      {organization && (
        <AssignContactDialog
          open={showAssignContact}
          onOpenChange={setShowAssignContact}
          onSuccess={handleAssignSuccess}
          organizationId={organization.id}
          organizationName={organization.name}
          companyId={companyId}
          existingContactIds={existingContactIds}
        />
      )}

      {/* Assign Project Dialog */}
      {organization && (
        <ProjectAssignmentDialog
          open={showAssignProject}
          onOpenChange={setShowAssignProject}
          onSuccess={handleAssignSuccess}
          entityType="organization"
          entityId={organization.id}
          entityName={organization.name}
          companyId={companyId}
          existingProjectIds={existingProjectIds}
        />
      )}

      {/* Remove Contact Confirmation */}
      <AlertDialog open={!!removeContactConfirm} onOpenChange={() => setRemoveContactConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Remove Contact</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove {removeContactConfirm?.name} from this organization?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveContact}
              disabled={isRemoving}
              className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Project Confirmation */}
      <AlertDialog open={!!removeProjectConfirm} onOpenChange={() => setRemoveProjectConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Remove from Project</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove this organization from {removeProjectConfirm?.name}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveProject}
              disabled={isRemoving}
              className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
