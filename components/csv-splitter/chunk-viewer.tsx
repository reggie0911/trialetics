"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ChunkViewResponse } from '@/lib/types/csv-splitter';

interface ChunkViewerProps {
  filename: string | null;
  open: boolean;
  onClose: () => void;
}

const ROWS_PER_PAGE = 50;

export function ChunkViewer({ filename, open, onClose }: ChunkViewerProps) {
  const [data, setData] = useState<ChunkViewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (open && filename) {
      fetchChunkData(filename);
      setCurrentPage(1);
    } else {
      setData(null);
      setError(null);
    }
  }, [open, filename]);

  const fetchChunkData = async (chunkFilename: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/csv-splitter/chunk/${encodeURIComponent(chunkFilename)}`);
      if (!response.ok) {
        let errorMessage = 'Failed to fetch chunk data';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      const chunkData: ChunkViewResponse = await response.json();
      setData(chunkData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chunk data');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  const totalPages = data ? Math.ceil(data.rows.length / ROWS_PER_PAGE) : 0;
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
  const endIndex = startIndex + ROWS_PER_PAGE;
  const currentRows = data?.rows.slice(startIndex, endIndex) || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {filename ? `Viewing: ${filename}` : 'Chunk Viewer'}
          </DialogTitle>
          <DialogDescription>
            {data && (
              <>
                Chunk #{data.chunkNumber} - {data.totalRows.toLocaleString()} rows total
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="py-8 text-center text-muted-foreground">
              Loading chunk data...
            </div>
          )}

          {error && (
            <div className="py-8 text-center text-destructive">
              {error}
            </div>
          )}

          {data && !isLoading && (
            <div className="space-y-4">
              {/* Header Rows */}
              {data.headers.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      {data.headers.map((headerRow, idx) => (
                        <TableRow key={idx} className="bg-muted/50">
                          {headerRow.map((cell, cellIdx) => (
                            <TableHead key={cellIdx} className="font-medium">
                              {String(cell)}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                  </Table>
                </div>
              )}

              {/* Data Rows */}
              {currentRows.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableBody>
                      {currentRows.map((row, rowIdx) => (
                        <TableRow key={startIndex + rowIdx}>
                          {row.map((cell, cellIdx) => (
                            <TableCell key={cellIdx}>
                              {String(cell)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {currentRows.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  No data rows in this chunk
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, data.rows.length)} of{' '}
              {data.rows.length.toLocaleString()} rows
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft />
                Previous
              </Button>
              <div className="text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
