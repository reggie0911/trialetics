'use client';

import { useState, useEffect } from 'react';
import { Loader2, User, Mail, Phone, Building2, FolderOpen, Pencil, Award, FileText, Plus, Trash2 } from 'lucide-react';
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
import { getContact, removeContactFromOrganization, removeContactFromProject } from '@/lib/actions/contacts';
import {
  ContactWithRelations,
  ENTITY_STATUS_LABELS,
  CONTACT_ROLE_LABELS,
  CONTACT_PROJECT_ROLE_LABELS,
  ORGANIZATION_TYPE_LABELS,
} from '@/lib/types/contacts-organizations';
import { AssignOrganizationDialog } from './assign-organization-dialog';
import { ProjectAssignmentDialog } from './project-assignment-dialog';

interface ContactDetailSheetProps {
  contact: ContactWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onRefresh: () => void;
  companyId: string;
}

export function ContactDetailSheet({
  contact: initialContact,
  open,
  onOpenChange,
  onEdit,
  onRefresh,
  companyId,
}: ContactDetailSheetProps) {
  const { toast } = useToast();
  const [contact, setContact] = useState<ContactWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAssignOrg, setShowAssignOrg] = useState(false);
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [removeOrgConfirm, setRemoveOrgConfirm] = useState<{ relationshipId: string; name: string } | null>(null);
  const [removeProjectConfirm, setRemoveProjectConfirm] = useState<{ relationshipId: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (open && initialContact) {
      loadFullContact(initialContact.id);
    }
  }, [open, initialContact]);

  const loadFullContact = async (id: string) => {
    setIsLoading(true);
    const result = await getContact(id);
    if (result.success && result.data) {
      setContact(result.data);
    }
    setIsLoading(false);
  };

  const handleRemoveOrganization = async () => {
    if (!removeOrgConfirm || !contact) return;
    
    setIsRemoving(true);
    const result = await removeContactFromOrganization(removeOrgConfirm.relationshipId);
    
    if (result.success) {
      toast({
        title: 'Organization removed',
        description: `Contact has been removed from ${removeOrgConfirm.name}.`,
      });
      loadFullContact(contact.id);
      onRefresh();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to remove from organization',
        variant: 'destructive',
      });
    }
    
    setIsRemoving(false);
    setRemoveOrgConfirm(null);
  };

  const handleRemoveProject = async () => {
    if (!removeProjectConfirm || !contact) return;
    
    setIsRemoving(true);
    const result = await removeContactFromProject(removeProjectConfirm.relationshipId);
    
    if (result.success) {
      toast({
        title: 'Project removed',
        description: `Contact has been removed from ${removeProjectConfirm.name}.`,
      });
      loadFullContact(contact.id);
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
    if (contact) {
      loadFullContact(contact.id);
    }
    onRefresh();
  };

  if (!initialContact) return null;

  const fullName = `${initialContact.first_name} ${initialContact.last_name}`;
  const existingOrgIds = contact?.organizations?.map((oc) => oc.organization.id) || [];
  const existingProjectIds = contact?.projects?.map((cp) => cp.protocol.id) || [];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[540px] overflow-y-auto p-6">
          <SheetHeader>
            <SheetTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              {fullName}
              {initialContact.credentials && (
                <span className="text-muted-foreground font-normal text-sm">
                  , {initialContact.credentials}
                </span>
              )}
            </SheetTitle>
            <SheetDescription className="mt-2 flex items-center gap-2">
              {initialContact.title && (
                <span className="text-xs">{initialContact.title}</span>
              )}
              <Badge
                variant={initialContact.status === 'active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {ENTITY_STATUS_LABELS[initialContact.status]}
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
                <TabsTrigger value="organizations" className="text-xs">
                  Organizations ({contact?.organizations?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="projects" className="text-xs">
                  Projects ({contact?.projects?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 space-y-4">
                {/* Contact Information */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {initialContact.email && (
                      <div className="flex items-center gap-2 text-xs">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <a href={`mailto:${initialContact.email}`} className="hover:underline">
                          {initialContact.email}
                        </a>
                      </div>
                    )}
                    {initialContact.phone && (
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <a href={`tel:${initialContact.phone}`} className="hover:underline">
                          {initialContact.phone}
                        </a>
                      </div>
                    )}
                    {!initialContact.email && !initialContact.phone && (
                      <p className="text-xs text-muted-foreground">No contact information provided.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Credentials & License */}
                {(initialContact.credentials || initialContact.license_number) && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium">Credentials</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {initialContact.credentials && (
                        <div className="flex items-center gap-2 text-xs">
                          <Award className="h-3 w-3 text-muted-foreground" />
                          <span>{initialContact.credentials}</span>
                        </div>
                      )}
                      {initialContact.license_number && (
                        <div className="flex items-center gap-2 text-xs">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span>License: {initialContact.license_number}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {initialContact.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {initialContact.notes}
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
                      <span>{new Date(initialContact.created_at).toLocaleDateString()}</span>
                    </div>
                    {initialContact.creator_email && (
                      <div className="flex justify-between">
                        <span>Created by</span>
                        <span>{initialContact.creator_email}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Last updated</span>
                      <span>{new Date(initialContact.updated_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="organizations" className="mt-4">
                <div className="flex justify-end mb-3">
                  <Button
                    size="sm"
                    onClick={() => setShowAssignOrg(true)}
                    className="text-xs h-7"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Assign to Organization
                  </Button>
                </div>
                {contact?.organizations && contact.organizations.length > 0 ? (
                  <div className="space-y-2">
                    {contact.organizations.map((oc) => (
                      <Card key={oc.id} className="p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-xs">{oc.organization.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {ORGANIZATION_TYPE_LABELS[oc.organization.organization_type]} • {CONTACT_ROLE_LABELS[oc.role]}
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
                              onClick={() => setRemoveOrgConfirm({
                                relationshipId: oc.id,
                                name: oc.organization.name,
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
                    <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground">No organizations assigned.</p>
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
                {contact?.projects && contact.projects.length > 0 ? (
                  <div className="space-y-2">
                    {contact.projects.map((cp) => (
                      <Card key={cp.id} className="p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="h-3 w-3 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-xs">{cp.protocol.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {cp.protocol.protocol_number} • {CONTACT_PROJECT_ROLE_LABELS[cp.role]}
                                {cp.organization && ` • ${cp.organization.name}`}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => setRemoveProjectConfirm({
                              relationshipId: cp.id,
                              name: cp.protocol.title,
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
              Edit Contact
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Assign Organization Dialog */}
      {contact && (
        <AssignOrganizationDialog
          open={showAssignOrg}
          onOpenChange={setShowAssignOrg}
          onSuccess={handleAssignSuccess}
          contactId={contact.id}
          contactName={fullName}
          companyId={companyId}
          existingOrganizationIds={existingOrgIds}
        />
      )}

      {/* Assign Project Dialog */}
      {contact && (
        <ProjectAssignmentDialog
          open={showAssignProject}
          onOpenChange={setShowAssignProject}
          onSuccess={handleAssignSuccess}
          entityType="contact"
          entityId={contact.id}
          entityName={fullName}
          companyId={companyId}
          existingProjectIds={existingProjectIds}
        />
      )}

      {/* Remove Organization Confirmation */}
      <AlertDialog open={!!removeOrgConfirm} onOpenChange={() => setRemoveOrgConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Remove from Organization</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Are you sure you want to remove this contact from {removeOrgConfirm?.name}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveOrganization}
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
              Are you sure you want to remove this contact from {removeProjectConfirm?.name}?
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
