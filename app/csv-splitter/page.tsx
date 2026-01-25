"use client";

import { useState } from 'react';
import { CsvSplitterForm } from '@/components/csv-splitter/csv-splitter-form';
import { ChunkList } from '@/components/csv-splitter/chunk-list';
import { ChunkViewer } from '@/components/csv-splitter/chunk-viewer';
import { SplitResult } from '@/lib/types/csv-splitter';
import { toast } from 'sonner';

export default function CsvSplitterPage() {
  const [selectedChunk, setSelectedChunk] = useState<string | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSplitComplete = (result: SplitResult) => {
    toast.success(
      `Successfully split CSV into ${result.totalChunks} chunk${result.totalChunks !== 1 ? 's' : ''} with ${result.totalRows.toLocaleString()} total rows`
    );
    // Trigger refresh of chunk list
    setRefreshKey(prev => prev + 1);
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  const handleViewChunk = (filename: string) => {
    setSelectedChunk(filename);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedChunk(null);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CSV Splitter Utility</h1>
          <p className="text-muted-foreground mt-2">
            Split large CSV files into smaller, manageable chunks. Each chunk includes the first two header rows.
          </p>
        </div>

        <CsvSplitterForm
          onSplitComplete={handleSplitComplete}
          onError={handleError}
        />

        <ChunkList
          key={refreshKey}
          onViewChunk={handleViewChunk}
          onRefresh={() => setRefreshKey(prev => prev + 1)}
        />

        <ChunkViewer
          filename={selectedChunk}
          open={isViewerOpen}
          onClose={handleCloseViewer}
        />
      </div>
    </div>
  );
}
