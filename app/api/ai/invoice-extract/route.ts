import { NextRequest } from 'next/server';
import OpenAI from 'openai';

import { createClient } from '@/lib/server';

const MAX_TEXT_LENGTH = 12000;

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    return result.text.trim().slice(0, MAX_TEXT_LENGTH);
  } catch {
    return '';
  }
}

/**
 * Upload a PDF to OpenAI Files API, extract via Responses API, then delete the file.
 * Returns parsed JSON object or throws with a descriptive message.
 */
async function extractPdfViaFilesApi(
  openai: OpenAI,
  buffer: Buffer,
  filename: string,
  systemPrompt: string,
): Promise<object> {
  let fileId: string | null = null;
  try {
    // 1. Upload the file to OpenAI
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
    const fileObj = new File([blob], filename, { type: 'application/pdf' });
    const uploaded = await openai.files.create({ file: fileObj, purpose: 'user_data' });
    fileId = uploaded.id;

    // 2. Ask the Responses API to read it
    const response = await openai.responses.create({
      model: 'gpt-4o',
      instructions: systemPrompt,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_file', file_id: fileId },
            { type: 'input_text', text: 'Extract invoice data from this PDF document. Return the result as JSON.' },
          ],
        },
      ],
      text: { format: { type: 'json_object' } },
    });

    const raw = response.output_text?.trim();
    if (!raw) throw new Error('Model returned an empty response for this PDF.');

    return JSON.parse(raw);
  } finally {
    // 3. Always delete the uploaded file (best-effort)
    if (fileId) {
      openai.files.delete(fileId).catch((err: unknown) => {
        console.error('[invoice-extract] Failed to delete OpenAI file:', err);
      });
    }
  }
}

const SYSTEM_PROMPT = `You are a clinical trial invoice data extractor. Given the text content of an invoice document (PDF text or image), extract the following fields into a JSON object. Be precise with numeric amounts. If a field cannot be determined, use null.

Return ONLY valid JSON with this schema:
{
  "invoiceNumber": "string or null",
  "vendorName": "string or null",
  "amount": "number or null (the total invoice amount)",
  "currency": "string or null (ISO 4217 code, e.g. USD, EUR)",
  "dueDate": "string or null (ISO 8601 date, e.g. 2026-04-15)",
  "invoiceDate": "string or null (ISO 8601 date)",
  "lineItems": [
    {
      "description": "string",
      "quantity": "number or null",
      "unitPrice": "number or null",
      "total": "number or null"
    }
  ],
  "confidence": "number 0-1 indicating your confidence in the extraction"
}`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'sk-REPLACE_WITH_YOUR_KEY') {
    return Response.json({ error: 'OpenAI not configured' }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const documentPath = formData.get('documentPath') as string | null;

  let textContent = '';
  let imageBase64: string | null = null;
  let mimeType = '';
  let pdfBuffer: Buffer | null = null;
  let pdfFilename = 'document.pdf';

  if (file) {
    mimeType = file.type;
    const buffer = Buffer.from(await file.arrayBuffer());
    pdfFilename = file.name || 'document.pdf';

    if (mimeType === 'application/pdf') {
      textContent = await extractPdfText(buffer);
      if (!textContent) {
        // No text layer (scanned / image-based PDF) — fall back to Files API
        pdfBuffer = buffer;
      }
    } else if (mimeType.startsWith('image/')) {
      imageBase64 = buffer.toString('base64');
    } else {
      return Response.json({ error: 'Unsupported file type. Use PDF, PNG, or JPEG.' }, { status: 400 });
    }
  } else if (documentPath) {
    const { data: fileData, error: dlError } = await supabase.storage
      .from('finance-documents')
      .download(documentPath);
    if (dlError || !fileData) {
      return Response.json({ error: 'Could not download document from storage.' }, { status: 400 });
    }
    const buffer = Buffer.from(await fileData.arrayBuffer());
    if (documentPath.toLowerCase().endsWith('.pdf')) {
      textContent = await extractPdfText(buffer);
      if (!textContent) {
        pdfBuffer = buffer;
        pdfFilename = documentPath.split('/').pop() || 'document.pdf';
      }
    } else {
      const ext = documentPath.split('.').pop()?.toLowerCase();
      mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
      imageBase64 = buffer.toString('base64');
    }
  } else {
    return Response.json({ error: 'Provide a file or documentPath.' }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: key });

  // Path 1: scanned / image-based PDF — upload to Files API and use Responses API
  if (pdfBuffer) {
    try {
      const extracted = await extractPdfViaFilesApi(openai, pdfBuffer, pdfFilename, SYSTEM_PROMPT);
      return Response.json({ extracted });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[invoice-extract] Responses API (PDF) failed:', msg);
      return Response.json({ error: `Could not extract PDF content: ${msg}` }, { status: 400 });
    }
  }

  if (!textContent && !imageBase64) {
    return Response.json({ error: 'Could not extract content from the document.' }, { status: 400 });
  }

  // Path 2: text-based PDF or image — use Chat Completions
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: 'Extract invoice data from this image:' },
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType || 'image/png'};base64,${imageBase64}` },
        },
      ],
    });
  } else {
    messages.push({
      role: 'user',
      content: `Extract invoice data from this document text:\n\n${textContent}`,
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return Response.json({ error: 'No response from AI' }, { status: 500 });

    const extracted = JSON.parse(raw);
    return Response.json({ extracted });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'AI extraction failed';
    console.error('[invoice-extract] Chat Completions failed:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
