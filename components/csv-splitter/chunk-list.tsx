"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Download, Trash2, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { ChunkMetadata } from '@/lib/types/csv-splitter';
import { formatDistanceToNow } from 'date-fns';

interface ChunkListProps {
  onViewChunk: (filename: string) => void;
  onRefresh?: () => void;
}

type SortField = 'createdAt' | 'filename' | 'rowCount' | 'fileSize';
type SortOrder = 'asc' | 'desc';

export function ChunkList({ onViewChunk, onRefresh }: ChunkListProps) {
  const [chunks, setChunks] = useState<ChunkMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // desc = newest first

  const fetchChunks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/csv-splitter/chunks');
      if (!response.ok) {
        throw new Error('Failed to fetch chunks');
      }
      const data = await response.json();
      setChunks(data.chunks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chunks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChunks();
  }, []);

  const handleDelete = async (filename: string) => {
    if (!confirm('Are you sure you want to delete this chunk file?')) {
      return;
    }

    setDeletingFilename(filename);
    try {
      const response = await fetch(`/api/csv-splitter/chunk/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete chunk';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Remove from local state
      setChunks(chunks.filter(chunk => chunk.filename !== filename));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete chunk';
      alert(errorMessage);
    } finally {
      setDeletingFilename(null);
    }
  };

  const handleDownload = (filename: string) => {
    window.open(`/api/csv-splitter/download/${encodeURIComponent(filename)}`, '_blank');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle sort order if clicking the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field, default to desc for date, asc for others
      setSortField(field);
      setSortOrder(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const sortedChunks = [...chunks].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'filename':
        comparison = a.filename.localeCompare(b.filename);
        break;
      case 'rowCount':
        comparison = a.rowCount - b.rowCount;
        break;
      case 'fileSize':
        comparison = a.fileSize - b.fileSize;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading chunks...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchChunks} variant="outline">
            <RefreshCw className="mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (chunks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generated Chunks</CardTitle>
          <CardDescription>
            Chunk files will appear here after splitting a CSV file.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No chunk files found
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Generated Chunks</CardTitle>
            <CardDescription>
              {chunks.length} chunk file{chunks.length !== 1 ? 's' : ''} available
            </CardDescription>
          </div>
          <Button onClick={fetchChunks} variant="outline" size="sm">
            <RefreshCw className="mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    onClick={() => handleSort('filename')}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    Filename
                    <SortIcon field="filename" />
                  </button>
                </TableHead>
                <TableHead>Original File</TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort('rowCount')}
                    className="flex items-center justify-end ml-auto hover:text-foreground transition-colors"
                  >
                    Rows
                    <SortIcon field="rowCount" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => handleSort('fileSize')}
                    className="flex items-center justify-end ml-auto hover:text-foreground transition-colors"
                  >
                    Size
                    <SortIcon field="fileSize" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort('createdAt')}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    Created
                    <SortIcon field="createdAt" />
                  </button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedChunks.map((chunk) => (
                <TableRow key={chunk.filename}>
                  <TableCell className="font-medium">{chunk.filename}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {chunk.originalFilename}
                  </TableCell>
                  <TableCell className="text-right">{chunk.rowCount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{formatFileSize(chunk.fileSize)}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(chunk.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onViewChunk(chunk.filename)}
                        title="View chunk"
                      >
                        <Eye />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDownload(chunk.filename)}
                        title="Download chunk"
                      >
                        <Download />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(chunk.filename)}
                        disabled={deletingFilename === chunk.filename}
                        title="Delete chunk"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
