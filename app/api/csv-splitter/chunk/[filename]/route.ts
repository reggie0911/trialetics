import { NextRequest, NextResponse } from 'next/server';
import { readChunkFile, deleteChunkFile } from '@/lib/utils/csv-splitter';
import { getUserStorageId } from '@/lib/utils/user-storage';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const userId = await getUserStorageId(request);
    const { filename: filenameParam } = await params;
    const filename = decodeURIComponent(filenameParam);

    // Security check: ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    const chunkData = await readChunkFile(filename, userId);
    return NextResponse.json(chunkData);
  } catch (error) {
    console.error('Error reading chunk file:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const userId = await getUserStorageId(request);
    const { filename: filenameParam } = await params;
    const filename = decodeURIComponent(filenameParam);

    // Security check: ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }

    await deleteChunkFile(filename, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chunk file:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
