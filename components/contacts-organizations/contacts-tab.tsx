'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ContactsDataTable } from './contacts-data-table';
import { ContactFormDialog } from './contact-form-dialog';
import { getAllOrganizations } from '@/lib/actions/organizations';
import { formatFieldName } from '@/lib/utils';
import {
  ContactWithRelations,
  ContactFilters,
  EntityStatus,
  Organization,
  ENTITY_STATUS_LABELS,
  ORGANIZATION_TYPE_LABELS,
} from '@/lib/types/contacts-organizations';

interface ContactsTabProps {
  contacts: ContactWithRelations[];
  total: number;
  filters: ContactFilters;
  onFiltersChange: (filters: ContactFilters) => void;
  onRefresh: () => void;
  companyId: string;
  profileId: string;
  userEmail: string;
  userRole?: string;
}

export function ContactsTab({
  contacts,
  total,
  filters,
  onFiltersChange,
  onRefresh,
  companyId,
  profileId,
  userEmail,
  userRole = 'user',
}: ContactsTabProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [editingContact, setEditingContact] = useState<ContactWithRelations | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  // Get unique titles from all contacts
  const uniqueTitles = Array.from(new Set(
    contacts
      .map((c) => c.title)
      .filter((title): title is string => !!title)
  )).sort();

  useEffect(() => {
    loadOrganizations();
  }, [companyId]);

  const loadOrganizations = async () => {
    const result = await getAllOrganizations(companyId);
    if (result.success && result.data) {
      setOrganizations(result.data);
    }
  };

  const handleSearch = () => {
    onFiltersChange({ ...filters, search: searchValue, page: 1 });
  };

  const handleTitleChange = (value: string | null) => {
    if (!value) return;
    onFiltersChange({
      ...filters,
      title: value === 'all' ? undefined : value,
      page: 1,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearFilters = () => {
    setSearchValue('');
    onFiltersChange({
      page: 1,
      pageSize: filters.pageSize,
    });
  };

  const handleStatusChange = (value: string | null) => {
    if (!value) return;
    onFiltersChange({
      ...filters,
      status: value as EntityStatus | 'all',
      page: 1,
    });
  };

  const handleOrganizationChange = (value: string | null) => {
    if (!value) return;
    onFiltersChange({
      ...filters,
      organization_id: value === 'all' ? undefined : value,
      page: 1,
    });
  };

  const handlePageChange = (page: number) => {
    onFiltersChange({ ...filters, page });
  };

  const handleView = (contact: ContactWithRelations) => {
    router.push(`/protected/contacts-organizations/contact/${contact.id}`);
  };

  const handleEdit = (contact: ContactWithRelations) => {
    setEditingContact(contact);
    setIsEditOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditOpen(false);
    setEditingContact(null);
    onRefresh();
  };

  const hasActiveFilters = filters.search || filters.title || filters.organization_id || filters.status;

  return (
    <div className="space-y-4">
      {/* Filter Section */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen} className="space-y-3">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs h-8 rounded-md px-3 font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
            <Filter className="h-3 w-3" />
            <span>Filters</span>
            {isFiltersOpen ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </CollapsibleTrigger>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-xs h-8">
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>

        <CollapsibleContent>
          <div className="rounded-lg border bg-card p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Label htmlFor="search" className="text-[10px] mb-1.5 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="search"
                    placeholder="Search contacts..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSearch}
                    className="pl-9 text-xs h-8 capitalize"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title" className="text-[10px] mb-1.5 block">Title</Label>
                <Select
                  value={filters.title || 'all'}
                  onValueChange={handleTitleChange}
                >
                  <SelectTrigger id="title" className="text-xs h-8 w-full capitalize">
                    <SelectValue placeholder="Title">
                      {filters.title && filters.title !== 'all' 
                        ? filters.title
                        : 'All Titles'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Titles</SelectItem>
                    {uniqueTitles.map((title) => (
                      <SelectItem key={title} value={title} className="text-xs">
                        {title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Organization */}
              <div>
                <Label htmlFor="organization" className="text-[10px] mb-1.5 block">Organization</Label>
                <Select
                  value={filters.organization_id || 'all'}
                  onValueChange={handleOrganizationChange}
                >
                  <SelectTrigger id="organization" className="text-xs h-8 w-full capitalize">
                    <SelectValue placeholder="Organization">
                      {filters.organization_id && filters.organization_id !== 'all'
                        ? organizations.find((o) => o.id === filters.organization_id)?.name || 'All Organizations'
                        : 'All Organizations'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Organizations</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id} className="text-xs">
                        {org.name} ({ORGANIZATION_TYPE_LABELS[org.organization_type]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status" className="text-[10px] mb-1.5 block">Status</Label>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={handleStatusChange}
                >
                  <SelectTrigger id="status" className="text-xs h-8 w-full capitalize">
                    <SelectValue placeholder="Status">
                      {filters.status && filters.status !== 'all' 
                        ? ENTITY_STATUS_LABELS[filters.status as EntityStatus] || formatFieldName(filters.status)
                        : 'All Status'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Status</SelectItem>
                    {Object.entries(ENTITY_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-xs">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Data Table */}
      <ContactsDataTable
        contacts={contacts}
        total={total}
        page={filters.page || 1}
        pageSize={filters.pageSize || 25}
        onPageChange={handlePageChange}
        onView={handleView}
        onEdit={handleEdit}
        onRefresh={onRefresh}
      />

      {/* Edit Dialog */}
      <ContactFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={handleEditSuccess}
        contact={editingContact}
        companyId={companyId}
        profileId={profileId}
        userEmail={userEmail}
        userRole={userRole}
      />
    </div>
  );
}
