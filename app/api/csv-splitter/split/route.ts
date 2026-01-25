import { NextRequest, NextResponse } from 'next/server';
import { splitCsvFile } from '@/lib/utils/csv-splitter';
import { SplitOptions } from '@/lib/types/csv-splitter';
import { getUserStorageId } from '@/lib/utils/user-storage';
import { cleanupOldChunkFiles } from '@/lib/utils/csv-splitter';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large files

export async function POST(request: NextRequest) {
  try {
    // Get user ID for storage isolation
    const userId = await getUserStorageId(request);

    // Run cleanup in background (don't wait for it)
    cleanupOldChunkFiles(24).catch(err => 
      console.error('Background cleanup failed:', err)
    );
    // Log request details for debugging
    const contentType = request.headers.get('content-type');
    const contentLength = request.headers.get('content-length');
    console.log('Request received:', {
      contentType,
      contentLength: contentLength ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB` : 'unknown',
    });

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error('Error parsing FormData:', error);
      console.error('Content-Type:', contentType);
      console.error('Content-Length:', contentLength);
      return NextResponse.json(
        {
          success: false,
          error: `Failed to parse request body as FormData: ${error instanceof Error ? error.message : 'Unknown error'}. Content-Type: ${contentType || 'not set'}`,
        },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File;
    const rowsPerChunk = parseInt(formData.get('rowsPerChunk') as string) || 10000;

    console.log('FormData parsed successfully:', {
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'unknown',
      rowsPerChunk,
    });

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate rows per chunk
    if (rowsPerChunk < 1 || rowsPerChunk > 1000000) {
      return NextResponse.json(
        { success: false, error: 'Rows per chunk must be between 1 and 1,000,000' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: 'File must be a CSV file (.csv extension required)' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'File is empty' },
        { status: 400 }
      );
    }

    // Read file content
    let fileContent: string;
    try {
      fileContent = await file.text();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        { status: 500 }
      );
    }

    const fileSize = file.size;

    // Warn for small files but allow processing
    if (fileSize < 100 * 1024 * 1024) {
      console.warn(`File size (${fileSize} bytes) is less than 100MB`);
    }

    // Split the file
    const options: SplitOptions = {
      rowsPerChunk,
      originalFilename: file.name,
    };

    const result = await splitCsvFile(fileContent, options, userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Create response with session cookie if needed
    const response = NextResponse.json(result);
    if (userId.startsWith('session_')) {
      const sessionId = userId.replace('session_', '');
      response.cookies.set('csv-splitter-session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }
    
    return response;
  } catch (error) {
    console.error('Error splitting CSV file:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
