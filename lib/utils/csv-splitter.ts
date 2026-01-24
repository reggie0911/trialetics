import Papa from 'papaparse';
import { promises as fs } from 'fs';
import path from 'path';
import { ChunkMetadata, SplitOptions, SplitProgress, SplitResult } from '@/lib/types/csv-splitter';
import { getUserStorageDir } from './user-storage';

const BASE_CHUNKS_DIR = path.join(process.cwd(), 'csv-chunks');

/**
 * Get user-specific chunks directory
 */
function getUserChunksDir(userId: string): string {
  return path.join(BASE_CHUNKS_DIR, userId);
}

/**
 * Ensure the chunks directory exists for a user
 */
export async function ensureChunksDirectory(userId: string): Promise<string> {
  const userDir = getUserChunksDir(userId);
  try {
    await fs.access(userDir);
  } catch {
    await fs.mkdir(userDir, { recursive: true });
  }
  return userDir;
}

/**
 * Get file size in bytes
 */
async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * Count rows in a CSV file
 */
async function countRows(filePath: string): Promise<number> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  return lines.length;
}

/**
 * Split CSV file content into chunks
 * This function processes the file content in chunks to handle large files
 */
export async function splitCsvFile(
  fileContent: string,
  options: SplitOptions,
  userId: string,
  onProgress?: (progress: SplitProgress) => void
): Promise<SplitResult> {
  const userDir = await ensureChunksDirectory(userId);

  const originalFilename = path.basename(options.originalFilename, path.extname(options.originalFilename));
  const chunks: ChunkMetadata[] = [];
  let headerRows: string[][] = [];
  const chunkData: string[][][] = []; // Store chunks to write later
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

          // When chunk is full, store it for later writing
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
        complete: async () => {
          try {
            // Add remaining rows as the last chunk
            if (currentChunk.length > 0) {
              chunkData.push(currentChunk);
            }

            // Write all chunks to files
            for (let i = 0; i < chunkData.length; i++) {
              await writeChunk(
                originalFilename,
                i + 1,
                headerRows,
                chunkData[i],
                chunks,
                userDir
              );
            }

            // Calculate final metadata
            const totalRows = totalRowsProcessed;
            const totalChunks = chunks.length;

            resolve({
              success: true,
              chunks,
              totalRows,
              totalChunks,
            });
          } catch (error) {
            reject({
              success: false,
              chunks: [],
              error: error instanceof Error ? error.message : 'Unknown error writing chunks',
              totalRows: totalRowsProcessed,
              totalChunks: 0,
            });
          }
        },
        error: (error: Error) => {
          reject({
            success: false,
            chunks: [],
            error: error.message || 'Unknown error parsing CSV',
            totalRows: 0,
            totalChunks: 0,
          });
        },
      });
    } catch (error) {
      reject({
        success: false,
        chunks: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        totalRows: 0,
        totalChunks: 0,
      });
    }
  });
}


/**
 * Write a chunk to a file
 */
async function writeChunk(
  originalFilename: string,
  chunkNumber: number,
  headerRows: string[][],
  rows: string[][],
  chunks: ChunkMetadata[],
  userDir: string
): Promise<void> {
  // Combine headers and rows
  const allRows = [...headerRows, ...rows];

  // Convert to CSV string
  const csvContent = Papa.unparse(allRows);

  // Generate filename
  const chunkFilename = `${originalFilename}_chunk_${String(chunkNumber).padStart(3, '0')}.csv`;
  const chunkPath = path.join(userDir, chunkFilename);

  // Write file
  await fs.writeFile(chunkPath, csvContent, 'utf-8');

  // Get file stats
  const fileSize = await getFileSize(chunkPath);
  const rowCount = allRows.length;

  // Add metadata
  chunks.push({
    filename: chunkFilename,
    originalFilename: `${originalFilename}.csv`,
    chunkNumber,
    rowCount,
    fileSize,
    createdAt: new Date().toISOString(),
    filePath: chunkPath,
  });
}

/**
 * Get list of chunk files for a specific user
 */
export async function getChunkFiles(userId: string): Promise<ChunkMetadata[]> {
  const userDir = await ensureChunksDirectory(userId);

  try {
    const files = await fs.readdir(userDir);
    const csvFiles = files.filter(file => file.endsWith('.csv'));

    const chunks: ChunkMetadata[] = [];

    for (const file of csvFiles) {
      const filePath = path.join(userDir, file);
      const stats = await fs.stat(filePath);
      const rowCount = await countRows(filePath);

      // Extract chunk number from filename
      const match = file.match(/_chunk_(\d+)\.csv$/);
      const chunkNumber = match ? parseInt(match[1], 10) : 0;

      // Extract original filename
      const originalFilename = file.replace(/_chunk_\d+\.csv$/, '.csv');

      chunks.push({
        filename: file,
        originalFilename,
        chunkNumber,
        rowCount,
        fileSize: stats.size,
        createdAt: stats.birthtime.toISOString(),
        filePath: filePath,
      });
    }

    // Sort by chunk number
    return chunks.sort((a, b) => a.chunkNumber - b.chunkNumber);
  } catch (error) {
    console.error('Error reading chunk files:', error);
    return [];
  }
}

/**
 * Read a specific chunk file for a user
 */
export async function readChunkFile(filename: string, userId: string): Promise<{
  headers: string[][];
  rows: string[][];
  totalRows: number;
  chunkNumber: number;
}> {
  const userDir = getUserChunksDir(userId);
  const filePath = path.join(userDir, filename);

  // Security check: ensure file is within user's directory
  if (!filePath.startsWith(userDir)) {
    throw new Error('Invalid file path');
  }

  const content = await fs.readFile(filePath, 'utf-8');
  const parsed = Papa.parse(content, {
    header: false,
    skipEmptyLines: true,
  });

  const allRows = parsed.data as string[][];
  const headers = allRows.slice(0, 2);
  const rows = allRows.slice(2);

  // Extract chunk number from filename
  const match = filename.match(/_chunk_(\d+)\.csv$/);
  const chunkNumber = match ? parseInt(match[1], 10) : 0;

  return {
    headers,
    rows,
    totalRows: rows.length,
    chunkNumber,
  };
}

/**
 * Delete a chunk file for a user
 */
export async function deleteChunkFile(filename: string, userId: string): Promise<void> {
  const userDir = getUserChunksDir(userId);
  const filePath = path.join(userDir, filename);

  // Security check: ensure file is within user's directory
  if (!filePath.startsWith(userDir)) {
    throw new Error('Invalid file path');
  }

  await fs.unlink(filePath);
}

/**
 * Clean up old chunk files (older than 24 hours)
 * This runs automatically and can be called manually
 */
export async function cleanupOldChunkFiles(maxAgeHours: number = 24): Promise<number> {
  let deletedCount = 0;
  const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
  const cutoffTime = Date.now() - maxAge;

  try {
    // Check if base directory exists
    try {
      await fs.access(BASE_CHUNKS_DIR);
    } catch {
      return 0; // Directory doesn't exist, nothing to clean
    }

    // Get all user directories
    const userDirs = await fs.readdir(BASE_CHUNKS_DIR);
    
    for (const userDirName of userDirs) {
      const userDirPath = path.join(BASE_CHUNKS_DIR, userDirName);
      const stats = await fs.stat(userDirPath);
      
      // Skip if not a directory
      if (!stats.isDirectory()) {
        continue;
      }

      try {
        const files = await fs.readdir(userDirPath);
        const csvFiles = files.filter(file => file.endsWith('.csv'));

        for (const file of csvFiles) {
          const filePath = path.join(userDirPath, file);
          const fileStats = await fs.stat(filePath);
          const fileAge = Date.now() - fileStats.mtimeMs;

          if (fileAge > maxAge) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        }

        // If directory is empty after cleanup, remove it
        const remainingFiles = await fs.readdir(userDirPath);
        if (remainingFiles.length === 0) {
          await fs.rmdir(userDirPath);
        }
      } catch (error) {
        console.error(`Error cleaning up files for user ${userDirName}:`, error);
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('Error during cleanup:', error);
    return deletedCount;
  }
}

/**
 * Delete all chunk files for a specific user
 */
export async function deleteAllUserChunkFiles(userId: string): Promise<void> {
  const userDir = getUserChunksDir(userId);

  try {
    const files = await fs.readdir(userDir);
    const csvFiles = files.filter(file => file.endsWith('.csv'));

    await Promise.all(
      csvFiles.map(file => fs.unlink(path.join(userDir, file)))
    );

    // Remove user directory if empty
    const remainingFiles = await fs.readdir(userDir);
    if (remainingFiles.length === 0) {
      await fs.rmdir(userDir);
    }
  } catch (error) {
    console.error('Error deleting user chunk files:', error);
    throw error;
  }
}
