import { NextRequest } from 'next/server';
import OpenAI, { APIError } from 'openai';

import { createClient } from '@/lib/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);

const VISION_PROMPT = `Analyze this logo or brand image. Describe the visual style, color palette, typography style, logo shape, mood, and overall aesthetic in 2-3 sentences for use as a logo generation prompt. Do not copy any trademarked names or logos; describe only abstract visual qualities.`;

function detectMimeFromBuffer(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  const riff = buf.subarray(0, 4).toString('ascii');
  const webp = buf.subarray(8, 12).toString('ascii');
  if (riff === 'RIFF' && webp === 'WEBP') return 'image/webp';
  return null;
}

function normalizeMime(fileType: string, buffer: Buffer): string | null {
  let mime = (fileType || '').toLowerCase().trim();
  if (mime === 'image/jpg') mime = 'image/jpeg';
  if (!mime || !ALLOWED.has(mime)) {
    mime = detectMimeFromBuffer(buffer) ?? '';
  }
  if (!ALLOWED.has(mime)) return null;
  return mime;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'OpenAI is not configured' }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get('image');
    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'Missing image file' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return Response.json({ error: 'Image must be 10MB or smaller.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const mime = normalizeMime(file.type, buffer);
    if (!mime) {
      return Response.json(
        { error: 'Invalid file type. Use PNG, JPEG, or WebP.' },
        { status: 400 },
      );
    }

    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

    const openai = new OpenAI({ apiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: dataUrl, detail: 'low' },
            },
            {
              type: 'text',
              text: `${VISION_PROMPT}

Respond with a JSON object only in this exact shape: {"styleDescription":"<your description>"}`,
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return Response.json({ error: 'Could not analyze image' }, { status: 422 });
    }

    let parsed: { styleDescription?: string };
    try {
      parsed = JSON.parse(raw) as { styleDescription?: string };
    } catch {
      return Response.json({ error: 'Could not parse analysis result' }, { status: 422 });
    }

    const styleDescription = parsed.styleDescription?.trim() ?? '';
    if (!styleDescription) {
      return Response.json({ error: 'Could not analyze image' }, { status: 422 });
    }

    return Response.json({ styleDescription });
  } catch (err: unknown) {
    console.error('BrandForge analyze-image error:', err);
    if (err instanceof APIError) {
      return Response.json(
        { error: err.message || 'OpenAI request failed' },
        { status: err.status && err.status >= 400 && err.status < 600 ? err.status : 500 },
      );
    }
    return Response.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}
