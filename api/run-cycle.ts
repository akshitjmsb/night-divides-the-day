import { kv } from '@vercel/kv';
import { GoogleGenerativeAI } from '@google/genai';

export const config = { runtime: 'edge' };

type GeneratedContent = {
  date: string;
  generatedAt: string;
  summary: string;
  poem: string;
  couplet: string;
  scene: string;
  source: 'server';
};

function getNowInET(): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});

  const dateString = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.000-05:00`;
  // Create a Date from ET components; the offset (-05:00) may differ in DST, but we only need hour/day.
  return new Date(dateString);
}

function etDateString(d: Date): string {
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

function addDaysET(base: Date, deltaDays: number): Date {
  const tmp = new Date(base.getTime());
  tmp.setUTCDate(tmp.getUTCDate() + deltaDays);
  return tmp;
}

async function generateContentForDate(targetDate: string): Promise<GeneratedContent> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  const nowIso = new Date().toISOString();

  if (!apiKey) {
    // Fallback content when API key is missing
    return {
      date: targetDate,
      generatedAt: nowIso,
      summary: 'Daily reflections placeholder. Configure GEMINI_API_KEY to enable server-side generation.',
      poem: 'A quiet day awaits,\nWhere focus meets gentle light;\nWe move with steady pace.',
      couplet: 'Work with care; rest with grace.\nTwilight teaches us our pace.',
      scene: 'An empty desk at dusk, a notebook open to the next page.',
      source: 'server',
    };
  }

  const ai = new GoogleGenerativeAI({ apiKey });
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const [summary, poem, couplet, scene] = await Promise.all([
    model.generateContent(`Give a motivating 2-3 sentence plan/summary for the day ${targetDate}. Keep it actionable, calm, and positive.`)
      .then(r => r.response.text())
      .catch(() => 'A calm, actionable day plan.'),
    model.generateContent(`Compose a short free-verse poem for ${targetDate}, 3-5 lines, reflective but upbeat.`)
      .then(r => r.response.text())
      .catch(() => 'A brief poem of focus and light.'),
    model.generateContent(`Write a two-line rhymed couplet for ${targetDate} about balance of work and rest.`)
      .then(r => r.response.text())
      .catch(() => 'Balance guides our way;\nWe work, then rest, each day.'),
    model.generateContent(`Describe a single evocative scene for a dashboard header for ${targetDate}, one concise sentence.`)
      .then(r => r.response.text())
      .catch(() => 'A desk bathed in warm afternoon light.'),
  ]);

  return {
    date: targetDate,
    generatedAt: nowIso,
    summary: summary.trim(),
    poem: poem.trim(),
    couplet: couplet.trim(),
    scene: scene.trim(),
    source: 'server',
  };
}

export default async function handler(_req: Request): Promise<Response> {
  try {
    const nowEt = getNowInET();
    const hourEt = Number(
      new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', hour: '2-digit', hour12: false })
        .formatToParts(nowEt)
        .find(p => p.type === 'hour')?.value || '00'
    );

    const todayEtStr = etDateString(nowEt);
    const tomorrowEtStr = etDateString(addDaysET(nowEt, 1));

    // Idempotency key per day
    const idKey = `run-cycle:executed:${todayEtStr}`;
    const alreadyRan = await kv.get<boolean>(idKey);

    let ran = false;
    let targetDate = tomorrowEtStr;
    let content: GeneratedContent | null = null;

    if (hourEt === 17 && !alreadyRan) {
      content = await generateContentForDate(tomorrowEtStr);
      await kv.set(`content:${tomorrowEtStr}`, content);
      await kv.set(idKey, true, { ex: 60 * 60 * 24 });
      ran = true;
    }

    // Heartbeat
    await kv.set('cron:lastRun', new Date().toISOString());

    return new Response(
      JSON.stringify({ ok: true, ran, hourEt, todayEtStr, targetDate, contentStored: Boolean(content) }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = (error as Error)?.message || 'Unknown error';
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}


