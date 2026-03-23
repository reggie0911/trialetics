'use client';

import { useState, useEffect, useTransition, useMemo } from 'react';
import { RotateCcw, SlidersHorizontal, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StaffEdlTable } from './staff-edl-table';
import { StaffEdlFilters } from './staff-edl-filters';
import {
  getEtmfSites,
  getStaffEdlRoles,
  getStaffEdlMatrix,
} from '@/lib/actions/etmf';
import type {
  EtmfStudyOption,
  EtmfSiteOption,
  TmfReferenceModel,
  EtmfRoleColumn,
  EtmfStaffEdlMatrixRow,
  EtmfStaffEdlFilters,
} from '@/lib/types/etmf';

interface StaffEdlClientProps {
  studies: EtmfStudyOption[];
  initialStudyId: string | null;
  initialSites: EtmfSiteOption[] | null;
  tmfRefs: TmfReferenceModel[];
}

export function StaffEdlClient({
  studies,
  initialStudyId,
  initialSites,
  tmfRefs,
}: StaffEdlClientProps) {
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(initialStudyId);
  const [sites, setSites] = useState<EtmfSiteOption[] | null>(initialSites);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [roles, setRoles] = useState<EtmfRoleColumn[]>([]);
  const [matrixData, setMatrixData] = useState<EtmfStaffEdlMatrixRow[]>([]);
  const [isPending, startTransition] = useTransition();

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EtmfStaffEdlFilters>({});

  useEffect(() => {
    if (selectedStudyId) {
      startTransition(async () => {
        const { data } = await getEtmfSites(selectedStudyId);
        setSites(data || null);
        setSelectedSiteId(null);
        setRoles([]);
        setMatrixData([]);
      });
    }
  }, [selectedStudyId]);

  useEffect(() => {
    if (selectedSiteId) {
      startTransition(async () => {
        const [rolesRes, matrixRes] = await Promise.all([
          getStaffEdlRoles(selectedSiteId),
          getStaffEdlMatrix(selectedSiteId),
        ]);
        setRoles(rolesRes.data || []);
        setMatrixData(matrixRes.data || []);
      });
    }
  }, [selectedSiteId]);

  const handleStudyChange = (studyId: string) => {
    setSelectedStudyId(studyId);
  };

  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId);
  };

  const handleReset = () => {
    setSearchQuery('');
    setFilters({});
  };

  const refreshMatrix = () => {
    if (!selectedSiteId) return;
    startTransition(async () => {
      const { data } = await getStaffEdlMatrix(selectedSiteId);
      setMatrixData(data || []);
    });
  };

  const filteredMatrix = useMemo(() => {
    return matrixData.filter((row) => {
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const match =
          row.artifact_name?.toLowerCase().includes(search) ||
          row.recommended_sub_artifact?.toLowerCase().includes(search);
        if (!match) return false;
      }

      if (filters.artifact_name && !row.artifact_name?.includes(filters.artifact_name)) {
        return false;
      }

      if (filters.sub_artifact && row.recommended_sub_artifact !== filters.sub_artifact) {
        return false;
      }

      return true;
    });
  }, [matrixData, searchQuery, filters]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Site Staff Expected Document List</h1>
      </div>

      <div className="text-sm text-muted-foreground flex items-center gap-2 mb-4">
        Show Filters
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {showFilters && (
        <StaffEdlFilters
          tmfRefs={tmfRefs}
          filters={filters}
          onApply={(f) => { setFilters(f); setShowFilters(false); }}
          onClose={() => setShowFilters(false)}
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Study</label>
          <Select value={selectedStudyId || ''} onValueChange={handleStudyChange}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Select Study...">
                {selectedStudyId 
                  ? studies.find(s => s.id === selectedStudyId)?.protocol_number || 'Select Study...'
                  : 'Select Study...'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {studies.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.protocol_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Site Name</label>
          <Select value={selectedSiteId || ''} onValueChange={handleSiteChange} disabled={!sites?.length}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Select Site...">
                {selectedSiteId 
                  ? sites?.find(s => s.id === selectedSiteId)?.name || 'Select Site...'
                  : 'Select Site...'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(sites || []).map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Start typing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-end gap-2">
          <Button variant="outline" size="icon" onClick={handleReset} title="Reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {selectedSiteId ? (
        <StaffEdlTable
          matrix={filteredMatrix}
          roles={roles}
          siteId={selectedSiteId}
          isPending={isPending}
          onRefresh={refreshMatrix}
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Select a study and site to view Staff Expected Document List.
        </div>
      )}
    </div>
  );
}
