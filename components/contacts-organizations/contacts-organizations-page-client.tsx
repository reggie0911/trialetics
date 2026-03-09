'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Building2, Users, MapPin, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { OrganizationsTab } from './organizations-tab';
import { ContactsTab } from './contacts-tab';
import { UnassignedSitesTable } from './unassigned-sites-table';
import { OrganizationFormDialog } from './organization-form-dialog';
import { ContactFormDialog } from './contact-form-dialog';
import { BulkUploadDialog } from './bulk-upload-dialog';
import {
  getOrganizations,
  getContactsOrganizationsStats,
  getUnassignedSites,
  type UnassignedSitesFilters,
} from '@/lib/actions/organizations';
import { getContacts } from '@/lib/actions/contacts';
import {
  OrganizationWithRelations,
  ContactWithRelations,
  ContactsOrganizationsStats,
  OrganizationFilters,
  ContactFilters,
} from '@/lib/types/contacts-organizations';

interface ContactsOrganizationsPageClientProps {
  companyId: string;
  profileId: string;
  userEmail: string;
  userRole?: string;
}

export function ContactsOrganizationsPageClient({
  companyId,
  profileId,
  userEmail,
  userRole = 'user',
}: ContactsOrganizationsPageClientProps) {
  const { toast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState<'organizations' | 'contacts' | 'unassigned-sites'>('organizations');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data state
  const [organizations, setOrganizations] = useState<OrganizationWithRelations[]>([]);
  const [organizationsTotal, setOrganizationsTotal] = useState(0);
  const [distinctSiteIds, setDistinctSiteIds] = useState<string[]>([]);
  const [contacts, setContacts] = useState<ContactWithRelations[]>([]);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [stats, setStats] = useState<ContactsOrganizationsStats | null>(null);

  // Filter state
  const [orgFilters, setOrgFilters] = useState<OrganizationFilters>({
    page: 1,
    pageSize: 25,
  });
  const [contactFilters, setContactFilters] = useState<ContactFilters>({
    page: 1,
    pageSize: 25,
  });
  const [unassignedFilters, setUnassignedFilters] = useState<UnassignedSitesFilters>({
    page: 1,
    pageSize: 25,
  });
  const [unassignedSites, setUnassignedSites] = useState<OrganizationWithRelations[]>([]);
  const [unassignedTotal, setUnassignedTotal] = useState(0);

  // Dialog state
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);

  // Fetch data
  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }

    try {
      const [orgsResult, contactsResult, statsResult, unassignedResult] = await Promise.all([
        getOrganizations(companyId, orgFilters),
        getContacts(companyId, contactFilters),
        getContactsOrganizationsStats(companyId),
        getUnassignedSites(companyId, { page: 1, pageSize: 1 }),
      ]);

      if (orgsResult.success && orgsResult.data) {
        setOrganizations(orgsResult.data.organizations);
        setOrganizationsTotal(orgsResult.data.total);
        setDistinctSiteIds(orgsResult.data.distinctSiteIds || []);
      } else if (!orgsResult.success) {
        toast({
          title: 'Error loading organizations',
          description: orgsResult.error || 'Failed to load organizations',
          variant: 'destructive',
        });
      }

      if (contactsResult.success && contactsResult.data) {
        setContacts(contactsResult.data.contacts);
        setContactsTotal(contactsResult.data.total);
      } else if (!contactsResult.success) {
        toast({
          title: 'Error loading contacts',
          description: contactsResult.error || 'Failed to load contacts',
          variant: 'destructive',
        });
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while loading data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [companyId, orgFilters, contactFilters, toast]);

  // Fetch organizations only
  const fetchOrganizations = useCallback(async () => {
    const result = await getOrganizations(companyId, orgFilters);
    if (result.success && result.data) {
      setOrganizations(result.data.organizations);
      setOrganizationsTotal(result.data.total);
      setDistinctSiteIds(result.data.distinctSiteIds || []);
    }
  }, [companyId, orgFilters]);

  // Fetch contacts only
  const fetchContacts = useCallback(async () => {
    const result = await getContacts(companyId, contactFilters);
    if (result.success && result.data) {
      setContacts(result.data.contacts);
      setContactsTotal(result.data.total);
    }
  }, [companyId, contactFilters]);

  // Fetch unassigned sites only
  const fetchUnassignedSites = useCallback(async () => {
    const result = await getUnassignedSites(companyId, unassignedFilters);
    if (result.success && result.data) {
      setUnassignedSites(result.data.organizations);
      setUnassignedTotal(result.data.total);
    }
  }, [companyId, unassignedFilters]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (!isLoading) {
      fetchOrganizations();
    }
  }, [orgFilters]);

  useEffect(() => {
    if (!isLoading) {
      fetchContacts();
    }
  }, [contactFilters]);

  useEffect(() => {
    if (!isLoading && activeTab === 'unassigned-sites') {
      fetchUnassignedSites();
    }
  }, [activeTab, unassignedFilters, fetchUnassignedSites, isLoading]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleOrgSuccess = () => {
    setIsOrgDialogOpen(false);
    fetchData(true);
  };

  const handleContactSuccess = () => {
    setIsContactDialogOpen(false);
    fetchData(true);
  };

  const handleUnassignedRefresh = () => {
    fetchData(true);
    fetchUnassignedSites();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Institutions</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_organizations || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sites</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_sites || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_contacts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Investigators</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_investigators || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <BulkUploadDialog
          companyId={companyId}
          profileId={profileId}
          userEmail={userEmail}
          onSuccess={handleRefresh}
        />
        {activeTab === 'organizations' && (
          <Button size="sm" onClick={() => setIsOrgDialogOpen(true)} className="text-xs">
            <Plus className="mr-2 h-4 w-4" />
            Add Institution
          </Button>
        )}
        {activeTab === 'contacts' && (
          <Button size="sm" onClick={() => setIsContactDialogOpen(true)} className="text-xs">
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'organizations' | 'contacts' | 'unassigned-sites')}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-[600px] grid-cols-3">
          <TabsTrigger value="organizations" className="text-xs">
            Institutions ({organizationsTotal})
          </TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs">
            Contacts ({contactsTotal})
          </TabsTrigger>
          <TabsTrigger value="unassigned-sites" className="text-xs">
            Unassigned Sites ({unassignedTotal})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="mt-6">
          <OrganizationsTab
            organizations={organizations}
            total={organizationsTotal}
            filters={orgFilters}
            onFiltersChange={setOrgFilters}
            onRefresh={() => fetchData(true)}
            distinctSiteIds={distinctSiteIds}
            companyId={companyId}
            profileId={profileId}
            userEmail={userEmail}
          />
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <ContactsTab
            contacts={contacts}
            total={contactsTotal}
            filters={contactFilters}
            onFiltersChange={setContactFilters}
            onRefresh={() => fetchData(true)}
            companyId={companyId}
            profileId={profileId}
            userEmail={userEmail}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="unassigned-sites" className="mt-6">
          <UnassignedSitesTable
            sites={unassignedSites}
            total={unassignedTotal}
            page={unassignedFilters.page || 1}
            pageSize={unassignedFilters.pageSize || 25}
            onPageChange={(page) => setUnassignedFilters((f) => ({ ...f, page }))}
            onRefresh={handleUnassignedRefresh}
            companyId={companyId}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <OrganizationFormDialog
        open={isOrgDialogOpen}
        onOpenChange={setIsOrgDialogOpen}
        onSuccess={handleOrgSuccess}
        companyId={companyId}
        profileId={profileId}
        userEmail={userEmail}
      />

      <ContactFormDialog
        open={isContactDialogOpen}
        onOpenChange={setIsContactDialogOpen}
        onSuccess={handleContactSuccess}
        companyId={companyId}
        profileId={profileId}
        userEmail={userEmail}
        userRole={userRole}
      />
    </div>
  );
}
