import { kv } from '@vercel/kv';

function getEasternNow(): { now: Date; ymd: string; hour: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map(p => [p.type, p.value]));
  const now = new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}-05:00`);
  const ymd = `${parts.year}-${parts.month}-${parts.day}`;
  return { now, ymd, hour: parseInt(parts.hour, 10) };
}

function ymdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

async function callGemini(prompt: string, opts?: { jsonSchema?: any; googleSearch?: boolean; asText?: boolean }): Promise<any> {
  const apiKey = (process.env as any).GEMINI_API_KEY as string;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey);
  const body: any = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  };
  if (opts?.jsonSchema) {
    body.generationConfig = { response_mime_type: 'application/json' };
  }
  if (opts?.googleSearch) {
    body.tools = [{ googleSearch: {} }];
  }
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (opts?.jsonSchema && text) {
    try { return JSON.parse(text); } catch { return null; }
  }
  return opts?.asText ? (text || '') : text;
}

async function generateForDate(dateKey: string): Promise<{ food: string; french: any; analytics: any; transport: any }> {
  // Food (text)
  const foodPrompt = `Create a full-day meal plan using only whole, minimally processed foods that naturally support libido for ${dateKey}. Format: simple list with headings (Breakfast, Lunch, Dinner, Snack). Be concise. Avoid markdown.`;
  const food = await callGemini(foodPrompt, { asText: true });

  // French (json)
  const frenchPrompt = `Act as a French phonetics teacher planning a long-term course. For the date ${dateKey}, create a self-contained lesson for a single, unique French phoneme. Provide { "sound": "...", "words": [{"word":"...","cue":"...","meaning":"..."}] } with exactly 10 words. No markdown.`;
  const french = await callGemini(frenchPrompt, { jsonSchema: {} });

  // Analytics (json)
  const analyticsPrompt = `Generate a unique, new set of daily technical topics for an analytics engineer for ${dateKey}. Provide JSON with keys sql{title,prompt,solution}, dax{title,prompt,solution}, snowflake{title,prompt,solution}, dbt{title,prompt,solution}, dataManagement{title,explanation}, dataQuality{title,explanation}.`;
  const analytics = await callGemini(analyticsPrompt, { jsonSchema: {} });

  // Transportation Physics (json)
  const transportPrompt = `For the date ${dateKey}, explain a single, fundamental physics principle behind a common mode of transportation. Provide JSON: { "title": "...", "explanation": "..." } using simple language.`;
  const transport = await callGemini(transportPrompt, { jsonSchema: {} });

  return { food, french, analytics, transport };
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const { hour, now } = getEasternNow();

    // Only act during the 5 PM hour (idempotent; also allow cron every hour)
    if (hour !== 17) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'outside-5pm-hour' }), { status: 200 });
    }

    // Determine cycle dates
    const activeDate = new Date(now); // At 5 PM we are switching to this date as the new cycle
    const previousCycleDate = new Date(now);
    previousCycleDate.setDate(previousCycleDate.getDate() - 1);

    const activeKey = ymdFromDate(activeDate);
    const prevKey = ymdFromDate(previousCycleDate);

    const cycleFlagKey = `cycle:executed:${activeKey}`;
    const already = await kv.get<string>(cycleFlagKey);
    if (already) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'already-executed' }), { status: 200 });
    }

    // Archive previous cycle
    const foodPrev = await kv.get<string>(`content:food:${prevKey}`);
    const frPrev = await kv.get(`content:french:${prevKey}`);
    const anPrev = await kv.get(`content:analytics:${prevKey}`);
    const tpPrev = await kv.get(`content:transport:${prevKey}`);

    const archiveBlob = {
      date: prevKey,
      archivedAt: new Date().toISOString(),
      foodPlan: foodPrev || null,
      frenchContent: frPrev || null,
      analyticsContent: anPrev || null,
      transportationContent: tpPrev || null
    };
    await kv.set(`archive:${prevKey}`, archiveBlob);

    // Generate fresh content for the active cycle date and store in KV
    const gen = await generateForDate(activeKey);
    await kv.set(`content:food:${activeKey}`, gen.food || foodPrev || '');
    await kv.set(`content:french:${activeKey}`, gen.french || frPrev || {});
    await kv.set(`content:analytics:${activeKey}`, gen.analytics || anPrev || {});
    await kv.set(`content:transport:${activeKey}`, gen.transport || tpPrev || {});

    await kv.set(cycleFlagKey, new Date().toISOString());

    return new Response(JSON.stringify({ ok: true, executed: true, date: activeKey }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'unknown' }), { status: 500 });
  }
}

export const config = { runtime: 'edge' };


