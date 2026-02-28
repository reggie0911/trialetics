'use client';

import { useState } from 'react';
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
import { OrganizationsDataTable } from './organizations-data-table';
import { OrganizationFormDialog } from './organization-form-dialog';
import { formatFieldName } from '@/lib/utils';
import {
  OrganizationWithRelations,
  OrganizationFilters,
  OrganizationType,
  EntityStatus,
  ORGANIZATION_TYPE_LABELS,
  ENTITY_STATUS_LABELS,
} from '@/lib/types/contacts-organizations';

interface OrganizationsTabProps {
  organizations: OrganizationWithRelations[];
  total: number;
  filters: OrganizationFilters;
  onFiltersChange: (filters: OrganizationFilters) => void;
  onRefresh: () => void;
  distinctSiteIds?: string[];
  companyId: string;
  profileId: string;
  userEmail: string;
}

export function OrganizationsTab({
  organizations,
  total,
  filters,
  onFiltersChange,
  onRefresh,
  distinctSiteIds = [],
  companyId,
  profileId,
  userEmail,
}: OrganizationsTabProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [editingOrg, setEditingOrg] = useState<OrganizationWithRelations | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  // Get unique organization names
  const uniqueNames = Array.from(new Set(
    organizations.map((o) => o.name)
  )).sort();

  // Get unique states and countries from addresses
  const uniqueStates = Array.from(new Set(
    organizations
      .flatMap((o) => o.addresses || [])
      .map((a) => a.state)
      .filter((s): s is string => !!s)
  )).sort();

  const uniqueCountries = Array.from(new Set(
    organizations
      .flatMap((o) => o.addresses || [])
      .map((a) => a.country)
      .filter((c): c is string => !!c)
  )).sort();

  // Site IDs for filter dropdown (from server; fallback to deriving from current orgs)
  const siteIdOptions = distinctSiteIds.length > 0
    ? distinctSiteIds
    : Array.from(new Set(
        organizations
          .filter((o) => o.organization_type === 'site' && o.site_id)
          .map((o) => o.site_id!)
      )).sort();

  const handleSearch = () => {
    onFiltersChange({ ...filters, search: searchValue, page: 1 });
  };

  const handleNameChange = (value: string | null) => {
    if (!value) return;
    onFiltersChange({
      ...filters,
      name: value === 'all' ? undefined : value,
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

  const handleTypeChange = (value: string | null) => {
    if (!value) return;
    onFiltersChange({
      ...filters,
      organization_type: value as OrganizationType | 'all',
      page: 1,
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

  const handleSiteIdChange = (value: string | null) => {
    if (!value) return;
    onFiltersChange({
      ...filters,
      site_id: value === 'all' ? undefined : value,
      page: 1,
    });
  };

  const handleStateChange = (value: string | null) => {
    if (!value) return;
    onFiltersChange({
      ...filters,
      state: value === 'all' ? undefined : value,
      page: 1,
    });
  };

  const handleCountryChange = (value: string | null) => {
    if (!value) return;
    onFiltersChange({
      ...filters,
      country: value === 'all' ? undefined : value,
      page: 1,
    });
  };

  const handlePageChange = (page: number) => {
    onFiltersChange({ ...filters, page });
  };

  const handleView = (org: OrganizationWithRelations) => {
    router.push(`/protected/contacts-organizations/${org.id}`);
  };

  const handleEdit = (org: OrganizationWithRelations) => {
    setEditingOrg(org);
    setIsEditOpen(true);
  };

  const handleEditSuccess = () => {
    setIsEditOpen(false);
    setEditingOrg(null);
    onRefresh();
  };

  const hasActiveFilters = filters.search || filters.name || filters.organization_type || filters.status || filters.site_id || filters.state || filters.country;

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
                    placeholder="Search organizations..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSearch}
                    className="pl-9 text-xs h-8 capitalize"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="name" className="text-[10px] mb-1.5 block">Name</Label>
                <Select
                  value={filters.name || 'all'}
                  onValueChange={handleNameChange}
                >
                  <SelectTrigger id="name" className="text-xs h-8 w-full capitalize">
                    <SelectValue placeholder="Name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Names</SelectItem>
                    {uniqueNames.map((name) => (
                      <SelectItem key={name} value={name} className="text-xs">
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div>
                <Label htmlFor="type" className="text-[10px] mb-1.5 block">Type</Label>
                <Select
                  value={filters.organization_type || 'all'}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger id="type" className="text-xs h-8 w-full capitalize">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Types</SelectItem>
                    {Object.entries(ORGANIZATION_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value} className="text-xs">
                        {label}
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

              {/* Site ID */}
              <div>
                <Label htmlFor="site_id" className="text-[10px] mb-1.5 block">Site ID</Label>
                <Select
                  value={filters.site_id || 'all'}
                  onValueChange={handleSiteIdChange}
                >
                  <SelectTrigger id="site_id" className="text-xs h-8 w-full capitalize">
                    <SelectValue placeholder="Site ID" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Site IDs</SelectItem>
                    {siteIdOptions.map((siteId) => (
                      <SelectItem key={siteId} value={siteId} className="text-xs">
                        {siteId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* State */}
              <div>
                <Label htmlFor="state" className="text-[10px] mb-1.5 block">State</Label>
                <Select
                  value={filters.state || 'all'}
                  onValueChange={handleStateChange}
                >
                  <SelectTrigger id="state" className="text-xs h-8 w-full capitalize">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All States</SelectItem>
                    {uniqueStates.map((state) => (
                      <SelectItem key={state} value={state} className="text-xs">
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Country */}
              <div>
                <Label htmlFor="country" className="text-[10px] mb-1.5 block">Country</Label>
                <Select
                  value={filters.country || 'all'}
                  onValueChange={handleCountryChange}
                >
                  <SelectTrigger id="country" className="text-xs h-8 w-full capitalize">
                    <SelectValue placeholder="Country">
                      {filters.country && filters.country !== 'all' 
                        ? filters.country
                        : 'All Countries'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Countries</SelectItem>
                    {uniqueCountries.map((country) => (
                      <SelectItem key={country} value={country} className="text-xs">
                        {country}
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
      <OrganizationsDataTable
        organizations={organizations}
        total={total}
        page={filters.page || 1}
        pageSize={filters.pageSize || 25}
        onPageChange={handlePageChange}
        onView={handleView}
        onEdit={handleEdit}
        onRefresh={onRefresh}
        emptyStateType={filters.organization_type && filters.organization_type !== 'all' ? filters.organization_type : undefined}
      />

      {/* Edit Dialog */}
      <OrganizationFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={handleEditSuccess}
        organization={editingOrg}
        companyId={companyId}
        profileId={profileId}
        userEmail={userEmail}
      />
    </div>
  );
}
