export interface ChunkMetadata {
  filename: string;
  originalFilename: string;
  chunkNumber: number;
  rowCount: number;
  fileSize: number;
  createdAt: string;
  filePath: string;
}

export interface SplitOptions {
  rowsPerChunk: number;
  originalFilename: string;
}

export interface SplitProgress {
  currentChunk: number;
  totalChunks: number;
  processedRows: number;
  totalRows: number;
  percentage: number;
}

export interface SplitResult {
  success: boolean;
  chunks: ChunkMetadata[];
  error?: string;
  totalRows: number;
  totalChunks: number;
}

export interface ChunkListResponse {
  chunks: ChunkMetadata[];
}

export interface ChunkViewResponse {
  headers: string[][];
  rows: string[][];
  totalRows: number;
  chunkNumber: number;
}
