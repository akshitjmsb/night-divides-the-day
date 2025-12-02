import { GoogleGenAI } from '@google/genai';

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
  
  console.log(`[run-cycle] Starting content generation for date: ${date}`);
  console.log(`[run-cycle] Request URL: ${req.url}`);
  console.log(`[run-cycle] User Agent: ${req.headers.get('user-agent')}`);

  const apiKey = getEnv('GEMINI_API_KEY') || getEnv('API_KEY');
  if (!apiKey) {
    console.error('[run-cycle] Missing API key - GEMINI_API_KEY and API_KEY are both undefined');
    return json({ 
      ok: false, 
      error: 'Missing GEMINI_API_KEY', 
      date,
      timestamp: new Date().toISOString(),
      details: 'Environment variables GEMINI_API_KEY or API_KEY not found'
    }, 500);
  }

  console.log(`[run-cycle] API key found, length: ${apiKey.length}`);

  const ai = new GoogleGenAI({ apiKey });

  try {
    console.log(`[run-cycle] Calling Gemini API for date: ${date}`);
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a concise, uplifting daily summary for ${date}. Keep it under 120 words, plain text.`,
    });

    const summary = (response.text || '').replace(/\*/g, '');
    
    if (!summary) {
      console.error('[run-cycle] Gemini API returned empty response');
      return json({ 
        ok: false, 
        error: 'empty_response', 
        date,
        timestamp: new Date().toISOString(),
        details: 'Gemini API returned empty content'
      }, 500);
    }

    console.log(`[run-cycle] Generated summary length: ${summary.length} characters`);

    // KV removed - content is now stored in Supabase only
    console.log(`[run-cycle] Content generated for date: ${date} (not saved to KV)`);

    return json({ 
      ok: true, 
      date,
      timestamp: new Date().toISOString(),
      summaryLength: summary.length
    });
  } catch (error) {
    console.error(`[run-cycle] Error during content generation:`, error);
    console.error(`[run-cycle] Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return json({ 
      ok: false, 
      error: 'generation_failed', 
      details: `${error}`,
      date,
      timestamp: new Date().toISOString()
    }, 500);
  }
}


