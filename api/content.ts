import { kv } from '@vercel/kv';

function parseDateParam(url: URL): string {
  const date = url.searchParams.get('date');
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  // default to Eastern today
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const dateKey = parseDateParam(url);
    const [food, french, analytics, transport] = await Promise.all([
      kv.get(`content:food:${dateKey}`),
      kv.get(`content:french:${dateKey}`),
      kv.get(`content:analytics:${dateKey}`),
      kv.get(`content:transport:${dateKey}`)
    ]);
    return new Response(JSON.stringify({ date: dateKey, food, french, analytics, transport }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'unknown' }), { status: 500 });
  }
}

export const config = { runtime: 'edge' };


