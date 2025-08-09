import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

function getETDate(date?: Date): { year: number; month: number; day: number; str: string } {
  const d = date ?? new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
  const str = `${parts.year}-${parts.month}-${parts.day}`;
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), str };
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? 30);

  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Simple rolling archive: fetch last N days of content keys if present
  const items: Array<{ date: string; data: unknown | null }> = [];
  const today = getETDate();

  for (let i = 0; i < limit; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const { str } = getETDate(d);
    // eslint-disable-next-line no-await-in-loop
    const data = await kv.get(`content:${str}`);
    if (data) items.push({ date: str, data });
  }

  return new Response(JSON.stringify({ count: items.length, items }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}


