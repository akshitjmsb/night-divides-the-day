export const config = { runtime: 'edge' } as const;

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

  // KV removed - returning empty response
  return json({ ok: true, data: null, date });
}


