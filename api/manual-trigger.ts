import { GoogleGenAI } from '@google/genai';
import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' } as const;

function getEnv(key: string): string | undefined {
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
  // Only allow POST requests for security
  if (req.method !== 'POST') {
    return json({ 
      ok: false, 
      error: 'Method not allowed. Use POST to trigger content generation.' 
    }, 405);
  }

  const url = new URL(req.url);
  const date = url.searchParams.get('date') || formatDateInEastern();
  
  console.log(`[manual-trigger] Manual content generation triggered for date: ${date}`);
  console.log(`[manual-trigger] Request URL: ${req.url}`);

  const apiKey = getEnv('GEMINI_API_KEY') || getEnv('API_KEY');
  if (!apiKey) {
    console.error('[manual-trigger] Missing API key');
    return json({ 
      ok: false, 
      error: 'Missing GEMINI_API_KEY', 
      date,
      timestamp: new Date().toISOString(),
      details: 'Environment variables GEMINI_API_KEY or API_KEY not found'
    }, 500);
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    console.log(`[manual-trigger] Calling Gemini API for date: ${date}`);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a concise, uplifting daily summary for ${date}. Keep it under 120 words, plain text.`,
    });

    const summary = (response.text || '').replace(/\*/g, '');
    
    if (!summary) {
      console.error('[manual-trigger] Gemini API returned empty response');
      return json({ 
        ok: false, 
        error: 'empty_response', 
        date,
        timestamp: new Date().toISOString(),
        details: 'Gemini API returned empty content'
      }, 500);
    }

    console.log(`[manual-trigger] Generated summary length: ${summary.length} characters`);

    await kv.set(`content:${date}`, {
      summary,
      generatedAt: new Date().toISOString(),
    });

    console.log(`[manual-trigger] Successfully saved content for date: ${date}`);

    return json({ 
      ok: true, 
      date,
      timestamp: new Date().toISOString(),
      summaryLength: summary.length,
      summary: summary.substring(0, 100) + '...' // Return first 100 chars for verification
    });
  } catch (error) {
    console.error(`[manual-trigger] Error during content generation:`, error);
    
    return json({ 
      ok: false, 
      error: 'generation_or_kv_failed', 
      details: `${error}`,
      date,
      timestamp: new Date().toISOString()
    }, 500);
  }
}
