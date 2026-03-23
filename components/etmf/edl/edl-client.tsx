'use client';

import { useState, useTransition, useMemo } from 'react';
import { RotateCcw, SlidersHorizontal, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EdlTable } from './edl-table';
import { EdlFilters } from './edl-filters';
import { getEtmfExpectedDocuments, initializeStudyEdl } from '@/lib/actions/etmf';
import type { EtmfStudyOption, EtmfExpectedDocument, TmfReferenceModel, EtmfEdlFilters } from '@/lib/types/etmf';
import { toast } from 'sonner';

interface EdlClientProps {
  studies: EtmfStudyOption[];
  initialStudyId: string | null;
  initialEdl: EtmfExpectedDocument[] | null;
  tmfRefs: TmfReferenceModel[];
}

export function EdlClient({ studies, initialStudyId, initialEdl, tmfRefs }: EdlClientProps) {
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(initialStudyId);
  const [edlData, setEdlData] = useState<EtmfExpectedDocument[] | null>(initialEdl);
  const [isPending, startTransition] = useTransition();

  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EtmfEdlFilters>({});

  const refreshEdl = () => {
    if (!selectedStudyId) return;
    startTransition(async () => {
      const { data } = await getEtmfExpectedDocuments(selectedStudyId);
      setEdlData(data || null);
    });
  };

  const handleStudyChange = (studyId: string) => {
    setSelectedStudyId(studyId);
    startTransition(async () => {
      const { data } = await getEtmfExpectedDocuments(studyId);
      setEdlData(data || null);
    });
  };

  const handleInitializeEdl = async () => {
    if (!selectedStudyId) return;
    startTransition(async () => {
      const { success, count, error } = await initializeStudyEdl(selectedStudyId);
      if (success) {
        toast.success(`Initialized ${count} EDL entries`);
        refreshEdl();
      } else {
        toast.error(error || 'Failed to initialize EDL');
      }
    });
  };

  const handleReset = () => {
    setSearchQuery('');
    setFilters({});
  };

  const filteredEdl = useMemo(() => {
    if (!edlData) return [];

    return edlData.filter((item) => {
      const tmf = item.tmf_reference;
      if (!tmf) return false;

      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const searchMatch =
          tmf.artifact_name?.toLowerCase().includes(search) ||
          tmf.recommended_sub_artifact?.toLowerCase().includes(search) ||
          tmf.section_name?.toLowerCase().includes(search);
        if (!searchMatch) return false;
      }

      if (filters.zone_number && tmf.zone_number !== filters.zone_number) return false;
      if (filters.section_number && tmf.section_number !== filters.section_number) return false;
      if (filters.core_or_recommended && tmf.core_or_recommended?.trim() !== filters.core_or_recommended) return false;
      if (filters.edl_yes !== undefined && item.edl_yes !== filters.edl_yes) return false;
      if (filters.site_level_yes !== undefined && item.site_level_yes !== filters.site_level_yes) return false;
      if (filters.country_level_yes !== undefined && item.country_level_yes !== filters.country_level_yes) return false;

      return true;
    });
  }, [edlData, searchQuery, filters]);

  const edlYesCount = edlData?.filter((e) => e.edl_yes).length || 0;
  const siteLevelYesCount = edlData?.filter((e) => e.site_level_yes).length || 0;
  const countryLevelYesCount = edlData?.filter((e) => e.country_level_yes).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Expected Document List</h1>
      </div>

      <div className="text-sm text-muted-foreground flex items-center gap-2 mb-4">
        Show Filters
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {showFilters && (
        <EdlFilters
          tmfRefs={tmfRefs}
          filters={filters}
          onApply={(f) => { setFilters(f); setShowFilters(false); }}
          onClose={() => setShowFilters(false)}
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="col-span-2">
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

        <div className="relative col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Start typing..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <Button variant="outline" size="icon" onClick={handleReset} title="Reset">
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={handleInitializeEdl} disabled={!selectedStudyId || isPending}>
          Initialize EDL
        </Button>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span>EDL Yes Count: {edlYesCount} / {edlData?.length || 0}</span>
        <span>Site Level Yes Count: {siteLevelYesCount} / {edlData?.length || 0}</span>
        <span>Country Level Yes Count: {countryLevelYesCount} / {edlData?.length || 0}</span>
      </div>

      <EdlTable
        edl={filteredEdl}
        studyId={selectedStudyId}
        isPending={isPending}
        onRefresh={refreshEdl}
      />
    </div>
  );
}
