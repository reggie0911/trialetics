/**
 * Site Detail Page Client Component
 * Specialized view for site organizations with 4-section card layout
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Mail, Phone, Globe, MapPin, Building2, Users, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  OrganizationWithRelations,
  ORGANIZATION_TYPE_LABELS,
  ENTITY_STATUS_LABELS,
  CONTACT_ROLE_LABELS,
} from '@/lib/types/contacts-organizations';
import { OrganizationFormDialog } from './organization-form-dialog';
import { SiteMilestoneDialog } from './site-milestone-dialog';
import { OrganizationMap } from './organization-map';

interface SiteDetailPageClientProps {
  organization: OrganizationWithRelations;
  companyId: string;
  profileId: string;
  userEmail: string;
}

export function SiteDetailPageClient({
  organization: initialOrg,
  companyId,
  profileId,
  userEmail,
}: SiteDetailPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showMilestoneDialog, setShowMilestoneDialog] = useState(false);

  const handleBack = () => {
    router.push('/protected/contacts-organizations');
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    router.refresh();
  };

  const handleMilestoneSuccess = () => {
    setShowMilestoneDialog(false);
    router.refresh();
    toast({
      title: 'Milestones updated',
      description: 'Site milestones have been updated successfully.',
    });
  };

  const primaryAddress = initialOrg.addresses?.find((addr) => addr.address_type === 'primary');
  
  // Get the first project (assuming site-project relationship)
  const siteProject = initialOrg.projects?.[0];
  
  // Get role-specific contacts
  const principalInvestigator = initialOrg.contacts?.find((oc) => oc.role === 'principal_investigator');
  const coordinator = initialOrg.contacts?.find((oc) => oc.role === 'coordinator');
  const clinicalMonitor = initialOrg.contacts?.find((oc) => oc.role === 'site_staff');

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

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

        {/* Site name and badges */}
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

        {/* 4-Column Card Grid */}
        <div className="grid gap-6 md:grid-cols-4">
          {/* Contact Information Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs md:text-xs font-medium">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {primaryAddress && (
                <>
                  <div className="flex items-start gap-2 text-xs md:text-xs">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <div className="space-y-1">
                        <p>{primaryAddress.street_1}</p>
                        {primaryAddress.street_2 && <p>{primaryAddress.street_2}</p>}
                        <p>
                          {primaryAddress.city}, {primaryAddress.state} {primaryAddress.postal_code}
                        </p>
                        <p>{primaryAddress.country}</p>
                      </div>
                    </div>
                  </div>

                  {/* Map Visual */}
                  <div className="mt-4">
                    <OrganizationMap organizationName={initialOrg.name} address={primaryAddress} />
                  </div>
                </>
              )}
              {initialOrg.phone && (
                <div className="flex items-start gap-2 text-xs md:text-xs">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <span className="text-muted-foreground">Primary Phone: </span>
                    <span className="font-medium">{initialOrg.phone}</span>
                  </div>
                </div>
              )}
              {initialOrg.website && (
                <div className="flex items-start gap-2 text-xs md:text-xs">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <a href={initialOrg.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">
                      {initialOrg.website}
                    </a>
                  </div>
                </div>
              )}
              {!primaryAddress && !initialOrg.phone && !initialOrg.website && (
                <p className="text-xs md:text-xs text-muted-foreground">No contact information available</p>
              )}
            </CardContent>
          </Card>

          {/* Primary Roles Card (Top-Right) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs md:text-xs font-medium">Primary Roles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 text-xs md:text-xs">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Principal Investigator: </span>
                  <span className="font-medium">
                    {principalInvestigator 
                      ? `${principalInvestigator.contact.first_name} ${principalInvestigator.contact.last_name}`
                      : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs md:text-xs">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Research Director: </span>
                  <span className="font-medium">
                    {coordinator 
                      ? `${coordinator.contact.first_name} ${coordinator.contact.last_name}`
                      : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2 text-xs md:text-xs">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Clinical Monitor: </span>
                  <span className="font-medium">
                    {clinicalMonitor 
                      ? `${clinicalMonitor.contact.first_name} ${clinicalMonitor.contact.last_name}`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* IRB/EC Institutions Section */}
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-xs md:text-xs font-medium mb-3">IRB/EC Institutions</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs md:text-xs">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">Local Institutional Review Board: </span>
                      <span className="font-medium">{siteProject?.irb_institution_name || 'N/A'}</span>
                    </div>
                  </div>
                  {siteProject?.irb_approval_number && (
                    <div className="flex items-start gap-2 text-xs md:text-xs">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <span className="text-muted-foreground">IRB Approval Number: </span>
                        <span className="font-medium">{siteProject.irb_approval_number}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information Card (Bottom-Left) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-xs md:text-xs font-medium">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs md:text-xs">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Site ID: </span>
                  <span className="font-medium">{initialOrg.id.slice(0, 8)}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Institution Type: </span>
                  <span className="font-medium capitalize">{ORGANIZATION_TYPE_LABELS[initialOrg.organization_type]}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Institution Status: </span>
                  <span className="font-medium capitalize">{ENTITY_STATUS_LABELS[initialOrg.status]}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Database Active Status: </span>
                  <span className="font-medium">{siteProject?.status === 'active' ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Database Active Date: </span>
                  <span className="font-medium">{formatDate(siteProject?.start_date)}</span>
                </div>
              </div>
              {siteProject?.end_date && (
                <>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">Database De-active Date: </span>
                      <span className="font-medium">{formatDate(siteProject.end_date)}</span>
                    </div>
                  </div>
                  {initialOrg.notes && (
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <span className="text-muted-foreground">Database De-active Reason: </span>
                        <span className="font-medium">{initialOrg.notes}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Site Milestones Card (Bottom-Right) */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs md:text-xs font-medium">Site Milestones</CardTitle>
              {siteProject && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMilestoneDialog(true)}
                  className="text-xs md:text-xs"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-xs md:text-xs">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Site Qualification Date: </span>
                  <span className="font-medium">{formatDate(siteProject?.site_qualification_date)}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">First Subject Enrolled Date: </span>
                  <span className="font-medium">{formatDate(siteProject?.first_subject_enrolled_date)}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Subject Screen Failure Count: </span>
                  <span className="font-medium">{siteProject?.screen_failure_count ?? 0}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Subject Enrolled Count: </span>
                  <span className="font-medium">{siteProject?.enrolled_subject_count ?? 0}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">First Completed Visit Date: </span>
                  <span className="font-medium">{formatDate(siteProject?.first_subject_enrolled_date)}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Last Completed Visit Date: </span>
                  <span className="font-medium">{formatDate(siteProject?.last_completed_visit_date)}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Last Subject Off Study: </span>
                  <span className="font-medium">{formatDate(siteProject?.last_subject_enrolled_date)}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <span className="text-muted-foreground">Close-Out Date: </span>
                  <span className="font-medium">{formatDate(siteProject?.close_out_date)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Edit Dialog */}
      <OrganizationFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        organization={initialOrg}
        companyId={companyId}
        profileId={profileId}
        userEmail={userEmail}
        onSuccess={handleEditSuccess}
      />

      {/* Milestone Edit Dialog */}
      {siteProject && (
        <SiteMilestoneDialog
          open={showMilestoneDialog}
          onOpenChange={setShowMilestoneDialog}
          organizationProjectId={siteProject.id}
          milestones={siteProject}
          onSuccess={handleMilestoneSuccess}
        />
      )}
    </>
  );
}
