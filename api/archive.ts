import { kv } from '@vercel/kv';

export default async function handler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new Response(JSON.stringify({ error: 'invalid-date' }), { status: 400 });
    }
    const data = await kv.get(`archive:${date}`);
    return new Response(JSON.stringify({ date, archive: data || null }), { status: 200, headers: { 'content-type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'unknown' }), { status: 500 });
  }
}

export const config = { runtime: 'edge' };


