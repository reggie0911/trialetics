'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, RotateCcw, SlidersHorizontal, Search } from 'lucide-react';
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
import { DocumentTable } from './document-table';
import { DocumentFilters } from './document-filters';
import { AddDocumentModal } from './add-document-modal';
import { getEtmfDocuments } from '@/lib/actions/etmf';
import type { EtmfStudyOption, EtmfDocument, EtmfDocumentFilters } from '@/lib/types/etmf';

interface DocumentLibraryClientProps {
  studies: EtmfStudyOption[];
  initialStudyId: string | null;
  initialDocuments: EtmfDocument[] | null;
}

export function DocumentLibraryClient({
  studies,
  initialStudyId,
  initialDocuments,
}: DocumentLibraryClientProps) {
  const router = useRouter();
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(initialStudyId);
  const [documents, setDocuments] = useState<EtmfDocument[] | null>(initialDocuments);
  const [isPending, startTransition] = useTransition();

  const [showFilters, setShowFilters] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<EtmfDocumentFilters>({});

  const refreshDocuments = (newFilters?: EtmfDocumentFilters) => {
    if (!selectedStudyId) return;
    startTransition(async () => {
      const { data } = await getEtmfDocuments(selectedStudyId, newFilters || filters);
      setDocuments(data || null);
    });
  };

  const handleStudyChange = (studyId: string) => {
    setSelectedStudyId(studyId);
    startTransition(async () => {
      const { data } = await getEtmfDocuments(studyId, filters);
      setDocuments(data || null);
    });
  };

  const handleSearch = () => {
    const newFilters = { ...filters, search: searchQuery };
    setFilters(newFilters);
    refreshDocuments(newFilters);
  };

  const handleReset = () => {
    setSearchQuery('');
    setFilters({});
    if (selectedStudyId) {
      startTransition(async () => {
        const { data } = await getEtmfDocuments(selectedStudyId, {});
        setDocuments(data || null);
      });
    }
  };

  const handleApplyFilters = (newFilters: EtmfDocumentFilters) => {
    setFilters(newFilters);
    setShowFilters(false);
    refreshDocuments(newFilters);
  };

  const documentCount = documents?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Document Library</h1>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Type here..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 text-xs"
          />
        </div>

        <Button variant="outline" size="icon" onClick={handleReset} title="Reset">
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} title="Filters">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>

        <Badge variant="secondary" className="px-3 py-1.5">
          Documents Listed: {documentCount}
        </Badge>

        <Select value={selectedStudyId || ''} onValueChange={handleStudyChange}>
          <SelectTrigger className="w-[200px] text-xs">
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

        <Button onClick={() => setShowAddDocument(true)} disabled={!selectedStudyId}>
          <Plus className="h-4 w-4 mr-2" />
          Add Document
        </Button>

        <Button variant="outline" onClick={() => router.push('/protected/etmf/bulk-upload')}>
          <Upload className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
      </div>

      {showFilters && (
        <DocumentFilters
          studyId={selectedStudyId}
          filters={filters}
          onApply={handleApplyFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      <DocumentTable documents={documents || []} isPending={isPending} />

      <AddDocumentModal
        open={showAddDocument}
        onOpenChange={setShowAddDocument}
        studyId={selectedStudyId}
        onSuccess={() => refreshDocuments()}
      />
    </div>
  );
}
