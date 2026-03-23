'use client';

import { useState, useTransition, useMemo } from 'react';
import { RotateCcw, Search, Upload } from 'lucide-react';
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
import { UploadTable } from './upload-table';
import { BulkUploadDropzone } from './bulk-upload-dropzone';
import { getBulkUploadDocuments, createEtmfDocument, uploadEtmfDocumentFile } from '@/lib/actions/etmf';
import type { EtmfStudyOption, BulkUploadDocument } from '@/lib/types/etmf';
import { toast } from 'sonner';

interface BulkUploadClientProps {
  studies: EtmfStudyOption[];
  initialStudyId: string | null;
  initialDocuments: BulkUploadDocument[] | null;
}

export function BulkUploadClient({
  studies,
  initialStudyId,
  initialDocuments,
}: BulkUploadClientProps) {
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(initialStudyId);
  const [documents, setDocuments] = useState<BulkUploadDocument[] | null>(initialDocuments);
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('');
  const [showDropzone, setShowDropzone] = useState(false);

  const refreshDocuments = () => {
    if (!selectedStudyId) return;
    startTransition(async () => {
      const { data } = await getBulkUploadDocuments(selectedStudyId);
      setDocuments(data || null);
    });
  };

  const handleStudyChange = (studyId: string) => {
    setSelectedStudyId(studyId);
    startTransition(async () => {
      const { data } = await getBulkUploadDocuments(studyId);
      setDocuments(data || null);
    });
  };

  const handleReset = () => {
    setSearchQuery('');
    setCreatorFilter('');
  };

  const handleFilesUploaded = async (files: File[]) => {
    if (!selectedStudyId) return;

    for (const file of files) {
      const { success, data, error } = await createEtmfDocument({
        study_id: selectedStudyId,
        document_name: file.name.replace(/\.[^/.]+$/, ''),
      });

      if (success && data) {
        const formData = new FormData();
        formData.append('file', file);
        await uploadEtmfDocumentFile(data.id, formData);
      } else {
        toast.error(`Failed to upload ${file.name}: ${error}`);
      }
    }

    toast.success(`Uploaded ${files.length} document(s)`);
    setShowDropzone(false);
    refreshDocuments();
  };

  const creators = useMemo(() => {
    if (!documents) return [];
    return [...new Set(documents.map((d) => d.creator_name))].sort();
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];

    return documents.filter((doc) => {
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        if (!doc.document_name.toLowerCase().includes(search) && !doc.file_name.toLowerCase().includes(search)) {
          return false;
        }
      }

      if (creatorFilter && doc.creator_name !== creatorFilter) {
        return false;
      }

      return true;
    });
  }, [documents, searchQuery, creatorFilter]);

  const documentCount = filteredDocuments.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Document Uploader</h1>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Type here..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <Button variant="outline" size="icon" onClick={handleReset} title="Reset">
          <RotateCcw className="h-4 w-4" />
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

        <Button onClick={() => setShowDropzone(!showDropzone)} disabled={!selectedStudyId}>
          <Upload className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Creator Name</label>
          <Select value={creatorFilter} onValueChange={setCreatorFilter}>
            <SelectTrigger className="w-[200px] text-xs">
              <SelectValue placeholder="All Creators">
                {creatorFilter || 'All Creators'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="" className="text-xs">All Creators</SelectItem>
              {creators.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showDropzone && (
        <BulkUploadDropzone
          onFilesSelected={handleFilesUploaded}
          onCancel={() => setShowDropzone(false)}
          isUploading={isPending}
        />
      )}

      <UploadTable documents={filteredDocuments} isPending={isPending} />
    </div>
  );
}
