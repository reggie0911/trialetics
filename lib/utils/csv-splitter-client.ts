'use client';

import Papa from 'papaparse';
import { SplitOptions, SplitProgress } from '@/lib/types/csv-splitter';

/**
 * Split CSV file content into chunks in-memory (client-side version for SDV uploads)
 * Returns chunks as CSV strings ready for upload to Supabase Storage
 * Preserves the 2-header-row structure that SDV upload logic expects:
 * - Row 0: Human-readable headers (will be skipped by Edge Function)
 * - Row 1: Technical headers (used for column mapping)
 * - Row 2+: Data rows
 */
export async function splitCsvFileToChunks(
  fileContent: string,
  options: SplitOptions,
  onProgress?: (progress: SplitProgress) => void
): Promise<{
  chunks: string[]; // CSV content strings (each includes 2 header rows + data)
  headers: string[][]; // First 2 header rows (for reference)
  totalRows: number;
  totalChunks: number;
}> {
  let headerRows: string[][] = [];
  const chunkData: string[][][] = []; // Store chunks as arrays
  let currentChunk: string[][] = [];
  let currentChunkNumber = 1;
  let totalRowsProcessed = 0;
  let rowIndex = 0;

  return new Promise((resolve, reject) => {
    try {
      Papa.parse(fileContent, {
        header: false,
        skipEmptyLines: true,
        step: (result) => {
          const row = result.data as string[];

          // Store first two rows as headers
          if (rowIndex < 2) {
            headerRows.push(row);
            rowIndex++;
            return;
          }

          // Add row to current chunk
          currentChunk.push(row);
          totalRowsProcessed++;
          rowIndex++;

          // When chunk is full, store it for later conversion
          if (currentChunk.length >= options.rowsPerChunk) {
            chunkData.push([...currentChunk]); // Copy the chunk
            currentChunk = [];
            currentChunkNumber++;

            if (onProgress) {
              onProgress({
                currentChunk: currentChunkNumber - 1,
                totalChunks: currentChunkNumber, // Estimate
                processedRows: totalRowsProcessed,
                totalRows: totalRowsProcessed, // We don't know total yet
                percentage: 0,
              });
            }
          }
        },
        complete: () => {
          try {
            // Add remaining rows as the last chunk
            if (currentChunk.length > 0) {
              chunkData.push(currentChunk);
            }

            // Convert all chunks to CSV strings
            const chunks: string[] = [];
            for (let i = 0; i < chunkData.length; i++) {
              // Combine headers and rows
              const allRows = [...headerRows, ...chunkData[i]];
              // Convert to CSV string
              const csvContent = Papa.unparse(allRows);
              chunks.push(csvContent);
            }

            const totalRows = totalRowsProcessed;
            const totalChunks = chunks.length;

            resolve({
              chunks,
              headers: headerRows,
              totalRows,
              totalChunks,
            });
          } catch (error) {
            reject(error);
          }
        },
        error: (error: Error) => {
          reject(error);
        },
      });
    } catch (error) {
      reject(error);
    }
  });
}
