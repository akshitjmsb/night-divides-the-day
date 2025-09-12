import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' } as const;

function json(data: unknown, init?: number | ResponseInit): Response {
  const initObj: ResponseInit =
    typeof init === 'number' ? { status: init } : init ?? {};
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
    ...initObj,
  });
}

export default async function handler(): Promise<Response> {
  try {
    // Return the last 30 content entries available
    const now = new Date();
    const keys: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      keys.push(`content:${iso}`);
    }
    const values = await kv.mget(...keys);
    const items = keys
      .map((k, idx) => ({ key: k, value: values[idx] }))
      .filter((x) => x.value != null);

    return json({ ok: true, items });
  } catch (error) {
    return json({ ok: false, error: `${error}` }, 500);
  }
}


