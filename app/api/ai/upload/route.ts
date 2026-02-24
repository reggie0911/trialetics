import { NextRequest } from 'next/server';
import { createClient } from '@/lib/server';
import crypto from 'crypto';

interface UploadedAttachment {
  id: string;
  type: 'image' | 'document';
  filename: string;
  mimeType: string;
  imageUrl?: string;
  textContent?: string;
  storagePath?: string;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_INLINE_SIZE = 2 * 1024 * 1024; // 2MB for base64 inline
const MAX_TEXT_LENGTH = 8000;

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    return result.text.slice(0, MAX_TEXT_LENGTH);
  } catch {
    return '[PDF text extraction failed]';
  }
}

async function extractExcelText(buffer: Buffer): Promise<string> {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) return '[Empty spreadsheet]';
    const csv = XLSX.utils.sheet_to_csv(firstSheet);
    return csv.slice(0, MAX_TEXT_LENGTH);
  } catch {
    return '[Excel text extraction failed]';
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return Response.json({ error: 'No files provided' }, { status: 400 });
    }

    const attachments: UploadedAttachment[] = [];

    for (const file of files) {
      const id = crypto.randomUUID();
      const buffer = Buffer.from(await file.arrayBuffer());
      const mimeType = file.type;
      const filename = file.name;

      if (IMAGE_TYPES.includes(mimeType)) {
        let imageUrl: string;
        const storagePath = `${user.id}/${id}-${filename}`;

        if (buffer.length <= MAX_INLINE_SIZE) {
          const base64 = buffer.toString('base64');
          imageUrl = `data:${mimeType};base64,${base64}`;
        } else {
          const { error: uploadError } = await supabase.storage
            .from('ai-attachments')
            .upload(storagePath, buffer, { contentType: mimeType });

          if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

          const { data: signedData } = await supabase.storage
            .from('ai-attachments')
            .createSignedUrl(storagePath, 3600);

          imageUrl = signedData?.signedUrl ?? '';
        }

        attachments.push({
          id,
          type: 'image',
          filename,
          mimeType,
          imageUrl,
          storagePath,
        });
      } else if (mimeType === 'application/pdf') {
        const textContent = await extractPdfText(buffer);
        attachments.push({ id, type: 'document', filename, mimeType, textContent });
      } else if (mimeType === 'text/csv' || mimeType === 'application/csv') {
        const textContent = buffer.toString('utf-8').slice(0, MAX_TEXT_LENGTH);
        attachments.push({ id, type: 'document', filename, mimeType, textContent });
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel'
      ) {
        const textContent = await extractExcelText(buffer);
        attachments.push({ id, type: 'document', filename, mimeType, textContent });
      } else {
        attachments.push({
          id,
          type: 'document',
          filename,
          mimeType,
          textContent: `[Unsupported file type: ${mimeType}]`,
        });
      }
    }

    return Response.json({ attachments });
  } catch (err) {
    console.error('AI upload error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
