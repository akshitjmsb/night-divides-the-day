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
  // KV removed - archive is now stored in Supabase only
  return json({ ok: true, items: [] });
}


