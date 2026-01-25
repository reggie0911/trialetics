import { NextRequest, NextResponse } from 'next/server';
import { getChunkFiles } from '@/lib/utils/csv-splitter';
import { getUserStorageId } from '@/lib/utils/user-storage';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserStorageId(request);
    
    // Ensure userId is valid
    if (!userId || typeof userId !== 'string') {
      console.error('Invalid userId received:', userId);
      return NextResponse.json(
        {
          chunks: [],
          error: 'Failed to identify user session',
        },
        { status: 500 }
      );
    }
    
    const chunks = await getChunkFiles(userId);
    return NextResponse.json({ chunks });
  } catch (error) {
    console.error('Error fetching chunk files:', error);
    return NextResponse.json(
      {
        chunks: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
