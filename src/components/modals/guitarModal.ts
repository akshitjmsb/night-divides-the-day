import { ai, getOrGenerateDynamicContent } from "../../api/gemini";
import { getDayOfYear } from "../../utils/date";
import { escapeHtml } from "../../utils/escapeHtml";

export async function fetchAndShowGuitarTab(activeContentDate: Date) {
    const modal = document.getElementById('guitar-modal');
    const contentEl = document.getElementById('guitar-content');
    if (!modal || !contentEl) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    contentEl.innerHTML = `<p>Loading today&apos;s guitar pick...</p>`;

    let data: {
        title: string;
        artist: string;
        key: string;
        tuning: string;
        lyricsWithChords: string;
        chordChanges: string;
        inspiration: string;
        youtubeLessonTitle: string;
        youtubeLessonUrl: string;
        spotifyUrl: string;
    } | null = null;

    try {
        const dayOfYear = getDayOfYear(activeContentDate);

        let songPool: Array<{ title: string; artist: string }> = [];
        try {
            const pool = await getOrGenerateDynamicContent('classic-rock-500', activeContentDate);
            if (Array.isArray(pool) && pool.length > 0) {
                songPool = pool
                    .filter(item => item && typeof item.title === 'string' && typeof item.artist === 'string')
                    .map(item => ({ title: item.title, artist: item.artist }));
            }
        } catch (e) {
            console.warn('Could not load classic-rock-500 pool. Falling back to AI-random.', e);
        }

        const RECENT_KEY = 'guitarRecentPicks';
        const loadRecent = (): string[] => {
            try { const raw = localStorage.getItem(RECENT_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
        };
        const saveRecent = (arr: string[]) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, 30))); } catch {} };
        const recent = loadRecent();

        let pickedTitle = '';
        let pickedArtist = '';
        if (songPool.length > 0) {
            const pool = songPool.filter(s => !recent.includes(`${s.title} — ${s.artist}`));
            const selectionPool = pool.length > 0 ? pool : songPool;
            const idx = Math.floor(Math.random() * selectionPool.length);
            const picked = selectionPool[idx];
            pickedTitle = picked.title; pickedArtist = picked.artist;
            saveRecent([`${picked.title} — ${picked.artist}`, ...recent.filter(x => x !== `${picked.title} — ${picked.artist}`)]);
        }

        const prompt = pickedTitle && pickedArtist
            ? `Create a concise guitar lesson for the specific classic rock song below. Return JSON ONLY with these exact fields. Do not add extra text.\n\nSong: "${pickedTitle}" by "${pickedArtist}"\n\n{\n  "title": "Song title only",\n  "artist": "Artist name",\n  "key": "Musical key (e.g., A minor, E major)",\n  "tuning": "Guitar tuning (e.g., Standard E A D G B E, Drop D, Eb Standard)",\n  "lyricsWithChords": "Multi-line text with chords inline or above lyrics. Keep it short (intro/verse/chorus). Use plain ASCII.",\n  "chordChanges": "Concise chord progression overview (e.g., Verse: G-D-Em-C | Chorus: C-G-Am-F)",\n  "inspiration": "Song facts about what inspired the song. Make me fall in love with it.",\n  "youtubeLessonTitle": "Best YouTube video title for a guitar lesson on this song",\n  "youtubeLessonUrl": "Direct YouTube URL starting with https:// (must be a watch URL, not Shorts or playlist)",\n  "spotifyUrl": "Direct Spotify track URL starting with https://open.spotify.com/"\n}\n\nRules:\n- Keep lyrics snippet short and fair-use; do not include full lyrics.\n- Ensure URLs are valid-looking and direct. No markdown, no extra commentary.`
            : `Give me a Random Classic Rock song that I can learn to play on Guitar for day ${dayOfYear} of the year. Return JSON ONLY with these exact fields:\n\n{\n  "title": "Song title only",\n  "artist": "Artist name",\n  "key": "Musical key (e.g., A minor, E major)",\n  "tuning": "Guitar tuning (e.g., Standard E A D G B E, Drop D, Eb Standard)",\n  "lyricsWithChords": "Multi-line text with chords inline or above lyrics. Keep it short (intro/verse/chorus). Use plain ASCII.",\n  "chordChanges": "Concise chord progression overview (e.g., Verse: G-D-Em-C | Chorus: C-G-Am-F)",\n  "inspiration": "Song facts about what inspired the song. Make me fall in love with it.",\n  "youtubeLessonTitle": "Best YouTube video title for a guitar lesson on this song",\n  "youtubeLessonUrl": "Direct YouTube URL starting with https:// (must be a watch URL, not Shorts or playlist)",\n  "spotifyUrl": "Direct Spotify track URL starting with https://open.spotify.com/"\n}\n\nRules:\n- Keep lyrics snippet short and fair-use; do not include full lyrics.\n- Ensure URLs are valid-looking and direct. No markdown, no extra commentary.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        title: { type: "STRING" },
                        artist: { type: "STRING" },
                        key: { type: "STRING" },
                        tuning: { type: "STRING" },
                        lyricsWithChords: { type: "STRING" },
                        chordChanges: { type: "STRING" },
                        inspiration: { type: "STRING" },
                        youtubeLessonTitle: { type: "STRING" },
                        youtubeLessonUrl: { type: "STRING" },
                        spotifyUrl: { type: "STRING" },
                    },
                    required: [
                        'title',
                        'artist',
                        'key',
                        'tuning',
                        'lyricsWithChords',
                        'chordChanges',
                        'inspiration',
                        'youtubeLessonTitle',
                        'youtubeLessonUrl',
                        'spotifyUrl',
                    ],
                } as any,
            },
        });

        try {
            data = JSON.parse(response.text);
        } catch (jsonError) {
            console.error('Failed to parse JSON for guitar feature:', jsonError);
            contentEl.innerHTML = `<p>Could not parse the guitar pick. Please try again later.</p>`;
            return;
        }
    } catch (error) {
        console.error('Error fetching Guitar feature:', error);
        contentEl.innerHTML = `<p>Could not retrieve a guitar pick at this time.</p>`;
        return;
    }

    if (!data) {
        contentEl.innerHTML = `<p>No data returned for this guitar pick.</p>`;
        return;
    }

    const safe = (s: string) => escapeHtml((s || '').replace(/\*/g, ''));
    const isValidYouTubeUrl = (url: string) => {
        if (!url) return false;
        const badPatterns = /\/shorts\//i;
        const validPatterns = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/i;
        return validPatterns.test(url) && !badPatterns.test(url);
    };
    const isLikelyGuitarLesson = (title: string, url: string) => {
        const t = (title || '').toLowerCase();
        const hasKeywords = t.includes('guitar') && (t.includes('lesson') || t.includes('tutorial') || t.includes('how to') || t.includes('tabs'));
        const notLiveOrShorts = !/\blive\b/i.test(t) && !/\/shorts\//i.test(url || '');
        return hasKeywords && notLiveOrShorts;
    };
    const isValidSpotifyTrackUrl = (url: string) => /^(https?:\/\/)?open\.spotify\.com\/track\/[A-Za-z0-9]{22}(\?.*)?$/i.test(url || '');

    const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${data.title} ${data.artist} guitar lesson`)}`;
    const spSearchUrl = `https://open.spotify.com/search/${encodeURIComponent(`${data.title} ${data.artist}`)}`;

    const ytIsUsable = isValidYouTubeUrl(data.youtubeLessonUrl) && isLikelyGuitarLesson(data.youtubeLessonTitle, data.youtubeLessonUrl);
    const chosenYouTubeUrl = ytIsUsable ? data.youtubeLessonUrl : ytSearchUrl;
    const chosenYouTubeTitle = ytIsUsable
        ? data.youtubeLessonTitle
        : `Search YouTube for ${data.title} ${data.artist} guitar lesson`;
    const chosenSpotifyUrl = isValidSpotifyTrackUrl(data.spotifyUrl) ? data.spotifyUrl : spSearchUrl;

    contentEl.innerHTML = `
        <div class="space-y-4">
            <h4 class="font-bold text-md">${safe(data.title)} — ${safe(data.artist)}</h4>

            <div class="text-sm">
                <p><span class="font-semibold">Key:</span> ${safe(data.key)}</p>
                <p><span class="font-semibold">Tuning:</span> ${safe(data.tuning)}</p>
            </div>

            <div class="bg-gray-100 p-3 rounded font-mono text-sm overflow-x-auto">
                <p class="font-semibold mb-1">Lyrics & Chords (excerpt)</p>
                <pre>${safe(data.lyricsWithChords)}</pre>
            </div>

            <div class="bg-blue-50 p-3 rounded text-sm">
                <p class="font-semibold mb-1">Chord Changes</p>
                <p>${safe(data.chordChanges)}</p>
            </div>

            <div class="text-sm">
                <p class="font-semibold mb-1">Why this song rocks</p>
                <p>${safe(data.inspiration)}</p>
            </div>

            <div class="text-sm">
                <p class="font-semibold mb-1">Best YouTube Lesson</p>
                <a href="${safe(chosenYouTubeUrl)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">
                    ${safe(chosenYouTubeTitle)}
                </a>
            </div>

            <div class="text-sm">
                <p class="font-semibold mb-1">Listen on Spotify</p>
                <a href="${safe(chosenSpotifyUrl)}" target="_blank" rel="noopener noreferrer" class="text-green-700 underline">
                    ${safe(chosenSpotifyUrl)}
                </a>
            </div>
        </div>
    `;
}
