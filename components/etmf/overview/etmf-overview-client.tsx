'use client';

import { useState, useTransition } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EtmfStatusBar } from './etmf-status-bar';
import { EtmfHierarchicalTable } from './etmf-hierarchical-table';
import { AddCountryModal } from './add-country-modal';
import { AddSiteModal } from './add-site-modal';
import { AddStaffMemberModal } from './add-staff-member-modal';
import { getEtmfOverviewStats, initializeStudyEdl } from '@/lib/actions/etmf';
import type { EtmfStudyOption, EtmfOverviewStats } from '@/lib/types/etmf';
import { toast } from 'sonner';

interface EtmfOverviewClientProps {
  greeting: string;
  studies: EtmfStudyOption[];
  initialStudyId: string | null;
  initialStats: EtmfOverviewStats | null;
}

export function EtmfOverviewClient({
  greeting,
  studies,
  initialStudyId,
  initialStats,
}: EtmfOverviewClientProps) {
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(initialStudyId);
  const [stats, setStats] = useState<EtmfOverviewStats | null>(initialStats);
  const [isPending, startTransition] = useTransition();

  const [showAddCountry, setShowAddCountry] = useState(false);
  const [showAddSite, setShowAddSite] = useState(false);
  const [showAddStaffMember, setShowAddStaffMember] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const [countryFilter, setCountryFilter] = useState<string>('');
  const [siteFilter, setSiteFilter] = useState<string>('');

  const refreshStats = () => {
    if (!selectedStudyId) return;
    startTransition(async () => {
      const { data } = await getEtmfOverviewStats(selectedStudyId);
      setStats(data || null);
    });
  };

  const handleStudyChange = (studyId: string) => {
    setSelectedStudyId(studyId);
    startTransition(async () => {
      const { data } = await getEtmfOverviewStats(studyId);
      setStats(data || null);
    });
  };

  const handleInitializeEdl = async () => {
    if (!selectedStudyId) return;
    startTransition(async () => {
      const { success, count, error } = await initializeStudyEdl(selectedStudyId);
      if (success) {
        toast.success(`Initialized ${count} EDL entries`);
        refreshStats();
      } else {
        toast.error(error || 'Failed to initialize EDL');
      }
    });
  };

  const handleAddSite = (countryId: string) => {
    setSelectedCountryId(countryId);
    setShowAddSite(true);
  };

  const handleAddStaffMember = (siteId: string) => {
    setSelectedSiteId(siteId);
    setShowAddStaffMember(true);
  };

  const allCountries = stats?.countries || [];
  const allSites = allCountries.flatMap((c) => c.sites);

  const filteredCountries = allCountries.filter((c) => {
    if (countryFilter && c.country_id !== countryFilter) return false;
    return true;
  });

  const filteredStats: EtmfOverviewStats | null = stats
    ? {
        ...stats,
        countries: filteredCountries.map((c) => ({
          ...c,
          sites: c.sites.filter((s) => {
            if (siteFilter && s.site_id !== siteFilter) return false;
            return true;
          }),
        })),
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
        <Button onClick={() => setShowAddCountry(true)} disabled={!selectedStudyId}>
          <Plus className="h-4 w-4 mr-2" />
          Add Country
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Select value={selectedStudyId || ''} onValueChange={handleStudyChange}>
          <SelectTrigger className="w-[280px] text-xs">
            <SelectValue placeholder="Select a Study...">
              {selectedStudyId && studies.find(s => s.id === selectedStudyId) 
                ? `${studies.find(s => s.id === selectedStudyId)!.protocol_number} - ${studies.find(s => s.id === selectedStudyId)!.title}`
                : 'Select a Study...'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {studies.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.protocol_number} - {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={refreshStats} disabled={!selectedStudyId || isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        <Button variant="outline" size="sm" onClick={handleInitializeEdl} disabled={!selectedStudyId || isPending}>
          Initialize EDL
        </Button>
      </div>

      {stats && (
        <>
          <EtmfStatusBar
            approved={stats.approved}
            rejected={stats.rejected}
            qcReview={stats.qc_review}
            placeholders={stats.placeholders}
          />

          <div className="flex items-center gap-4 flex-wrap">
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[200px] text-xs">
                <SelectValue placeholder="Country Name">
                  {countryFilter 
                    ? allCountries.find(c => c.country_id === countryFilter)?.country_name || 'All Countries'
                    : 'All Countries'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs">All Countries</SelectItem>
                {allCountries.map((c) => (
                  <SelectItem key={c.country_id} value={c.country_id} className="text-xs">
                    {c.country_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-[200px] text-xs">
                <SelectValue placeholder="Site Name">
                  {siteFilter 
                    ? allSites.find(s => s.site_id === siteFilter)?.site_name || 'All Sites'
                    : 'All Sites'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="" className="text-xs">All Sites</SelectItem>
                {allSites.map((s) => (
                  <SelectItem key={s.site_id} value={s.site_id} className="text-xs">
                    {s.site_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <EtmfHierarchicalTable
            stats={filteredStats}
            onAddSite={handleAddSite}
            onAddStaffMember={handleAddStaffMember}
          />
        </>
      )}

      {!stats && selectedStudyId && (
        <div className="text-center py-12 text-muted-foreground">
          No eTMF data yet. Click &quot;Initialize EDL&quot; to set up the Expected Document List for this study.
        </div>
      )}

      {!selectedStudyId && (
        <div className="text-center py-12 text-muted-foreground">
          Select a study to view eTMF overview.
        </div>
      )}

      <AddCountryModal
        open={showAddCountry}
        onOpenChange={setShowAddCountry}
        studyId={selectedStudyId}
        onSuccess={refreshStats}
      />

      <AddSiteModal
        open={showAddSite}
        onOpenChange={setShowAddSite}
        studyId={selectedStudyId}
        countryId={selectedCountryId}
        onSuccess={refreshStats}
      />

      <AddStaffMemberModal
        open={showAddStaffMember}
        onOpenChange={setShowAddStaffMember}
        studyId={selectedStudyId}
        siteId={selectedSiteId}
        onSuccess={refreshStats}
      />
    </div>
  );
}
