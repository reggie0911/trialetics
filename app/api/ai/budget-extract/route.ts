import { NextRequest } from 'next/server';
import OpenAI from 'openai';

import { createClient } from '@/lib/server';
import { spreadsheetBufferToPlainText } from '@/lib/utils/excel-spreadsheet';

const MAX_TEXT_LENGTH = 16000;

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
  prompt: string,
): Promise<object> {
  let fileId: string | null = null;
  try {
    const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
    const fileObj = new File([blob], filename, { type: 'application/pdf' });
    const uploaded = await openai.files.create({ file: fileObj, purpose: 'user_data' });
    fileId = uploaded.id;

    const response = await openai.responses.create({
      model: 'gpt-4o',
      instructions: systemPrompt,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_file', file_id: fileId },
            { type: 'input_text', text: `${prompt} Return the result as JSON.` },
          ],
        },
      ],
      text: { format: { type: 'json_object' } },
    });

    const raw = response.output_text?.trim();
    if (!raw) throw new Error('Model returned an empty response for this PDF.');

    return JSON.parse(raw);
  } finally {
    if (fileId) {
      openai.files.delete(fileId).catch((err: unknown) => {
        console.error('[budget-extract] Failed to delete OpenAI file:', err);
      });
    }
  }
}

async function extractExcelText(buffer: Buffer): Promise<string> {
  try {
    return await spreadsheetBufferToPlainText(buffer, { sheetMode: 'all', maxLength: MAX_TEXT_LENGTH });
  } catch {
    return '';
  }
}

const SYSTEM_PROMPT = `You are a clinical trial site budget extractor. Given a budget document (spreadsheet or PDF), extract structured budget data.

The budget document typically contains:
1. Sectioned line items (e.g., "IRB Fees", "Study Site Start-up Fees", "Additional Fees", "Data Collection and Procedures", "Follow-up Visits", "AE/SAE/UAE")
2. Each line item has: description, cost basis (e.g., "Per day", "One-time"), unit cost, quantity, total cost, overhead percentage, and payment destination (site, IRB, or vendor)
3. A summary table with category totals
4. Payment/payee information (payee name, tax ID, routing number, account number, SWIFT/BIC when present, other wire notes, institution, department, address)

Return ONLY valid JSON with this schema:
{
  "lineItems": [
    {
      "section": "string (section/group name)",
      "description": "string (line item name)",
      "costBasis": "string or null (pricing basis)",
      "unitCost": "number",
      "quantity": "number",
      "overheadRate": "number or null (decimal, e.g. 0.39 for 39%)",
      "paidTo": "site | irb | vendor"
    }
  ],
  "summary": {
    "startupFees": "number or null",
    "perSubjectPayment": "number or null",
    "closeOutFees": "number or null",
    "saeReporting": "number or null",
    "irbFees": "number or null",
    "overheadRate": "number or null (decimal)",
    "grandTotal": "number or null"
  },
  "paymentInfo": {
    "invoice_submission_email": "string or null (primary email for invoice submission)",
    "invoice_submission_email_cc": "string or null (CC addresses if listed)",
    "payee_name": "string or null",
    "tax_id": "string or null",
    "routing_number": "string or null (bank routing / ABA when listed)",
    "account_number": "string or null (account number when listed)",
    "swift_bic": "string or null (SWIFT or BIC code when listed, 8-11 chars)",
    "bank_wire_info": "string or null (only for other wire text not captured above)",
    "mail_to": "string or null",
    "institution": "string or null",
    "department": "string or null",
    "address": "string or null",
    "city_state_zip": "string or null"
  },
  "currency": "string (ISO 4217 code, default USD)",
  "confidence": "number 0-1"
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

  if (!file) {
    return Response.json({ error: 'No file provided.' }, { status: 400 });
  }

  const mimeType = file.type;
  const pdfFilename = file.name || 'document.pdf';
  const buffer = Buffer.from(await file.arrayBuffer());
  let textContent = '';
  let imageBase64: string | null = null;
  let pdfBuffer: Buffer | null = null;

  if (mimeType === 'application/pdf') {
    textContent = await extractPdfText(buffer);
    if (!textContent) {
      // Scanned / image-based PDF — fall back to Files API
      pdfBuffer = buffer;
    }
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel'
  ) {
    textContent = await extractExcelText(buffer);
  } else if (mimeType.startsWith('image/')) {
    imageBase64 = buffer.toString('base64');
  } else {
    return Response.json(
      { error: 'Unsupported file type. Use Excel (.xlsx), PDF, PNG, or JPEG.' },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey: key });

  // Path 1: scanned/image-based PDF — upload to Files API and use Responses API
  if (pdfBuffer) {
    try {
      const extracted = await extractPdfViaFilesApi(
        openai,
        pdfBuffer,
        pdfFilename,
        SYSTEM_PROMPT,
        'Extract the site budget data from this PDF document.',
      );
      return Response.json({ extracted });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[budget-extract] Responses API (PDF) failed:', msg);
      return Response.json({ error: `Could not extract PDF content: ${msg}` }, { status: 400 });
    }
  }

  if (!textContent && !imageBase64) {
    return Response.json({ error: 'Could not extract content from the document.' }, { status: 400 });
  }

  // Path 2: text-based content or image — use Chat Completions
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  if (imageBase64) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: 'Extract the site budget data from this image:' },
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${imageBase64}` },
        },
      ],
    });
  } else {
    messages.push({
      role: 'user',
      content: `Extract the site budget data from this document:\n\n${textContent}`,
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
    console.error('[budget-extract] Chat Completions failed:', msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
