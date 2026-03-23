'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronDown, Home, UserPlus, FolderOpen, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { EtmfOverviewStats, EtmfCountryStats, EtmfSiteStats, EtmfStaffStats } from '@/lib/types/etmf';
import { cn } from '@/lib/utils';

interface EtmfHierarchicalTableProps {
  stats: EtmfOverviewStats | null;
  onAddSite: (countryId: string) => void;
  onAddStaffMember: (siteId: string) => void;
}

export function EtmfHierarchicalTable({ stats, onAddSite, onAddStaffMember }: EtmfHierarchicalTableProps) {
  const router = useRouter();
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());

  if (!stats) return null;

  const toggleCountry = (countryId: string) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(countryId)) {
        next.delete(countryId);
      } else {
        next.add(countryId);
      }
      return next;
    });
  };

  const toggleSite = (siteId: string) => {
    setExpandedSites((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead>Country Name</TableHead>
            <TableHead>Sites Assigned</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead className="text-center">Placeholders</TableHead>
            <TableHead className="text-center">QC Review</TableHead>
            <TableHead className="text-center">Rejected</TableHead>
            <TableHead className="text-center">Approved</TableHead>
            <TableHead className="text-center">Total Documents</TableHead>
            <TableHead className="w-[120px]">Completeness %</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.countries.map((country, idx) => (
            <CountryRow
              key={country.country_id}
              country={country}
              index={idx + 1}
              isExpanded={expandedCountries.has(country.country_id)}
              expandedSites={expandedSites}
              onToggleCountry={() => toggleCountry(country.country_id)}
              onToggleSite={toggleSite}
              onAddSite={() => onAddSite(country.country_id)}
              onAddStaffMember={onAddStaffMember}
              onOpenLibrary={() => router.push('/protected/etmf/library')}
              onUpload={() => router.push('/protected/etmf/bulk-upload')}
            />
          ))}
          {stats.countries.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                No countries added yet. Click &quot;Add Country&quot; to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

interface CountryRowProps {
  country: EtmfCountryStats;
  index: number;
  isExpanded: boolean;
  expandedSites: Set<string>;
  onToggleCountry: () => void;
  onToggleSite: (siteId: string) => void;
  onAddSite: () => void;
  onAddStaffMember: (siteId: string) => void;
  onOpenLibrary: () => void;
  onUpload: () => void;
}

function CountryRow({
  country,
  index,
  isExpanded,
  expandedSites,
  onToggleCountry,
  onToggleSite,
  onAddSite,
  onAddStaffMember,
  onOpenLibrary,
  onUpload,
}: CountryRowProps) {
  return (
    <>
      <TableRow className="bg-muted/30 hover:bg-muted/50 cursor-pointer" onClick={onToggleCountry}>
        <TableCell className="font-medium">{index}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-medium">{country.country_name}</span>
          </div>
        </TableCell>
        <TableCell>{country.sites.length} Sites</TableCell>
        <TableCell />
        <TableCell className="text-center">{country.placeholders}</TableCell>
        <TableCell className="text-center">{country.qc_review}</TableCell>
        <TableCell className="text-center">{country.rejected}</TableCell>
        <TableCell className="text-center">{country.approved}</TableCell>
        <TableCell className="text-center">{country.total_documents}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Progress value={country.completeness_pct} className="h-2 flex-1" />
            <span className="text-xs w-10 text-right">{country.completeness_pct}%</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Add Site" onClick={onAddSite}>
              <Home className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Open Library" onClick={onOpenLibrary}>
              <FolderOpen className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Upload" onClick={onUpload}>
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {isExpanded &&
        country.sites.map((site) => (
          <SiteRow
            key={site.site_id}
            site={site}
            isExpanded={expandedSites.has(site.site_id)}
            onToggle={() => onToggleSite(site.site_id)}
            onAddStaffMember={() => onAddStaffMember(site.site_id)}
            onOpenLibrary={onOpenLibrary}
            onUpload={onUpload}
          />
        ))}
    </>
  );
}

interface SiteRowProps {
  site: EtmfSiteStats;
  isExpanded: boolean;
  onToggle: () => void;
  onAddStaffMember: () => void;
  onOpenLibrary: () => void;
  onUpload: () => void;
}

function SiteRow({ site, isExpanded, onToggle, onAddStaffMember, onOpenLibrary, onUpload }: SiteRowProps) {
  return (
    <>
      <TableRow className="bg-muted/10 hover:bg-muted/20 cursor-pointer" onClick={onToggle}>
        <TableCell />
        <TableCell>
          <div className="flex items-center gap-2 pl-6">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span>{site.site_name}</span>
          </div>
        </TableCell>
        <TableCell />
        <TableCell>{site.staff_members.length} Staff Members</TableCell>
        <TableCell className="text-center">{site.placeholders}</TableCell>
        <TableCell className="text-center">{site.qc_review}</TableCell>
        <TableCell className="text-center">{site.rejected}</TableCell>
        <TableCell className="text-center">{site.approved}</TableCell>
        <TableCell className="text-center">{site.total_documents}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Progress value={site.completeness_pct} className="h-2 flex-1" />
            <span className="text-xs w-10 text-right">{site.completeness_pct}%</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Add Staff Member" onClick={onAddStaffMember}>
              <UserPlus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Open Library" onClick={onOpenLibrary}>
              <FolderOpen className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Upload" onClick={onUpload}>
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {isExpanded &&
        site.staff_members.map((staff) => (
          <StaffRow key={staff.staff_member_id} staff={staff} onOpenLibrary={onOpenLibrary} onUpload={onUpload} />
        ))}
    </>
  );
}

interface StaffRowProps {
  staff: EtmfStaffStats;
  onOpenLibrary: () => void;
  onUpload: () => void;
}

function StaffRow({ staff, onOpenLibrary, onUpload }: StaffRowProps) {
  return (
    <TableRow className="hover:bg-muted/10">
      <TableCell />
      <TableCell>
        <div className="pl-12">
          <div className="font-medium">{staff.staff_name}</div>
          <div className="text-xs text-muted-foreground">{staff.role.replace(/_/g, ' ')}</div>
        </div>
      </TableCell>
      <TableCell />
      <TableCell />
      <TableCell className="text-center">{staff.placeholders}</TableCell>
      <TableCell className="text-center">{staff.qc_review}</TableCell>
      <TableCell className="text-center">{staff.rejected}</TableCell>
      <TableCell className="text-center">{staff.approved}</TableCell>
      <TableCell className="text-center">{staff.total_documents}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress value={staff.completeness_pct} className="h-2 flex-1" />
          <span className="text-xs w-10 text-right">{staff.completeness_pct}%</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Open Library" onClick={onOpenLibrary}>
            <FolderOpen className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Upload" onClick={onUpload}>
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
