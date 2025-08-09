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

    // Generate next cycle content via existing model prompts is client code; here we only ensure placeholders exist
    // Clients will not generate; server can be extended later to fetch Gemini.
    // For now, if missing, copy forward previous as a fallback to ensure consistency.
    const ensure = async (key: string, fallback: any) => {
      const exists = await kv.get(key);
      if (!exists && fallback) await kv.set(key, fallback);
    };

    await ensure(`content:food:${activeKey}`, foodPrev || '');
    await ensure(`content:french:${activeKey}`, frPrev || {});
    await ensure(`content:analytics:${activeKey}`, anPrev || {});
    await ensure(`content:transport:${activeKey}`, tpPrev || {});

    await kv.set(cycleFlagKey, new Date().toISOString());

    return new Response(JSON.stringify({ ok: true, executed: true, date: activeKey }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'unknown' }), { status: 500 });
  }
}

export const config = { runtime: 'edge' };


