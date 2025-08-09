import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

function getETDateString(date?: Date): string {
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
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const date = url.searchParams.get('date') ?? getETDateString();

  if (req.method === 'GET') {
    const data = await kv.get(`content:${date}`);
    return new Response(JSON.stringify({ date, data }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}));
    await kv.set(`content:${date}`, body);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
}


