import { ai } from "../../api/gemini";

export async function fetchAndShowHistory() {
    const modal = document.getElementById('history-modal');
    const contentEl = document.getElementById('history-content');
    if (!modal || !contentEl) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    contentEl.innerHTML = '<p>Searching YouTube for a history video...</p>';

    try {
        const prompt = `Using Google Search, find one highly-rated and popular history documentary or explainer video on YouTube about World War I or World War II from a reputable source like a well-known documentary channel, museum, or educational institution. Prioritize content that is likely to be permanently available. Respond with only the video title and the direct YouTube URL in this exact format:\nTitle: [video title]\nURL: [video URL]`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        let html = '';

        if (response.text) {
            const text = response.text.trim();
            const lines = text.split('\n');
            const titleLine = lines.find(line => line.toLowerCase().startsWith('title:'));
            const urlLine = lines.find(line => line.toLowerCase().startsWith('url:'));

            if (titleLine && urlLine) {
                const title = titleLine.split(':').slice(1).join(':').trim();
                const url = urlLine.split(':').slice(1).join(':').trim();
                html += `<h4 class="text-lg font-bold mb-2"><a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${title}</a></h4>`;
                html += `<p class="text-sm"><a href="${url}" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:underline">${url}</a></p>`;
            } else {
                html += `<p>${text.replace(/\n/g, '<br>')}</p>`;
            }
        } else {
            html += `<p>Could not find a history video at this time.</p>`;
        }

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks && groundingChunks.length > 0) {
            html += '<hr class="my-4 border-gray-300">';
            html += '<h4 class="text-md font-bold mb-2">Sources:</h4>';
            html += '<ul class="list-disc pl-5 text-sm space-y-1">';
            const uniqueSources = Array.from(new Map(groundingChunks.map(chunk => [chunk.web?.uri, chunk])).values());

            uniqueSources.forEach(chunk => {
                if (chunk && typeof chunk === 'object' && 'web' in chunk && chunk.web && typeof chunk.web === 'object' && 'uri' in chunk.web) {
                    const webChunk = chunk.web as { uri: string; title?: string };
                    html += `<li><a href="${webChunk.uri}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${webChunk.title || webChunk.uri}</a></li>`;
                }
            });
            html += '</ul>';
        }

        contentEl.innerHTML = html;

    } catch (error) {
        console.error("Error fetching History video:", error);
        contentEl.innerHTML = '<p>An API Error occurred. Could not fetch a history video at this time.</p>';
    }
}
