import { GoogleGenAI } from '@google/genai';
import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' } as const;

function getEnv(key: string): string | undefined {
  // Avoid depending on Node types during type-checking
  const env = (globalThis as any)?.process?.env ?? {};
  return env[key];
}

function formatDateInEastern(dateInput?: Date): string {
  const date = dateInput ?? new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  ) as Record<string, string>;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function json(data: unknown, init?: number | ResponseInit): Response {
  const initObj: ResponseInit =
    typeof init === 'number' ? { status: init } : init ?? {};
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
    ...initObj,
  });
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const date = url.searchParams.get('date') || formatDateInEastern();

  const apiKey = getEnv('GEMINI_API_KEY') || getEnv('API_KEY');
  if (!apiKey) {
    return json({ ok: false, error: 'Missing GEMINI_API_KEY', date }, 500);
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a concise, uplifting daily summary for ${date}. Keep it under 120 words, plain text.`,
    });

    const summary = (response.text || '').replace(/\*/g, '');

    await kv.set(`content:${date}`, {
      summary,
      generatedAt: new Date().toISOString(),
    });

    return json({ ok: true, date });
  } catch (error) {
    return json({ ok: false, error: 'generation_or_kv_failed', details: `${error}` }, 500);
  }
}


