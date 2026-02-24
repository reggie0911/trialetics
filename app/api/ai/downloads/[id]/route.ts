import { NextRequest, NextResponse } from 'next/server';
import { getTemporaryCSV } from '@/lib/utils/temp-csv-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entry = getTemporaryCSV(id);

  if (!entry) {
    return NextResponse.json(
      { error: 'File not found or expired' },
      { status: 404 }
    );
  }

  return new NextResponse(entry.csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${entry.filename}"`,
    },
  });
}
