import crypto from 'crypto';

interface TempFileEntry {
  csv: string;
  filename: string;
  expiresAt: number;
}

const tempStore = new Map<string, TempFileEntry>();

const TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanup() {
  const now = Date.now();
  for (const [id, entry] of tempStore) {
    if (entry.expiresAt < now) tempStore.delete(id);
  }
}

export function storeTemporaryCSV(csv: string, filename: string): string {
  cleanup();
  const id = crypto.randomUUID();
  tempStore.set(id, { csv, filename, expiresAt: Date.now() + TTL_MS });
  return id;
}

export function getTemporaryCSV(id: string): TempFileEntry | undefined {
  cleanup();
  return tempStore.get(id);
}
