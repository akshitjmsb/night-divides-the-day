import { ai } from "../../api/perplexity";
import { escapeHtml } from "../../utils/escapeHtml";

export async function fetchAndShowWorldOrder() {
    const modal = document.getElementById('geopolitics-modal');
    const headlinesContent = document.getElementById('geopolitics-headlines-content');

    if (!modal || !headlinesContent) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    headlinesContent.innerHTML = '<p>Searching the web for the latest headlines...</p>';

    try {
        if (!ai) {
            headlinesContent.innerHTML = `<p>AI functionality is not available. Please check your API key configuration.</p>`;
            return;
        }

        const prompt = "Be extremely brief. First, what is the single most important, recent headline about Donald Trump? State it in 10 words or less. Then, list the 5 most critical world order headlines (US/Canada focused) as ultra-short, scannable bullet points. Finally, list the 5 latest major headlines from India in the same brief format. Format your response clearly with section headers like 'Trump Headline:', 'US/Canada Headlines:', and 'India Headlines:'. Do not use asterisks or any markdown formatting.";

        const response = await ai.models.generateContent({
            model: "sonar",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        let html = '';

        if (response.text) {
            let formattedText = response.text
                .replace(/\*/g, '')
                .replace(/\n/g, '<br>');

            // Better parsing for sections - look for common patterns
            // Try to identify India headlines section
            const indiaMatch = formattedText.match(/(?:India|India Headlines?)[:\s]*<br>(.*?)(?:<br><br>|$)/i);
            const usMatch = formattedText.match(/(?:US|US\/Canada|US\/Canada Headlines?)[:\s]*<br>(.*?)(?:India|$)/i);
            const trumpMatch = formattedText.match(/(?:Trump|Donald Trump)[:\s]*<br>(.*?)(?:US|India|$)/i);

            // If we can't find India section, try to extract it from the end
            if (!indiaMatch && formattedText.includes('India')) {
                // Look for India mentions in the text
                const parts = formattedText.split(/India/i);
                if (parts.length > 1) {
                    // Take everything after "India" as India headlines
                    const indiaSection = parts.slice(1).join('India');
                    formattedText = formattedText.replace(new RegExp(indiaSection, 'i'), `<strong class="block mt-3 mb-1">India Headlines:</strong>${indiaSection}`);
                }
            }

            // Format section headers
            formattedText = formattedText
                .replace(/(?:Trump|Donald Trump)[:\s]*<br>/gi, '<strong class="block mt-3 mb-1">Trump Headline:</strong><br>')
                .replace(/(?:US|US\/Canada|US\/Canada Headlines?)[:\s]*<br>/gi, '<strong class="block mt-3 mb-1">US/Canada Headlines:</strong><br>')
                .replace(/(?:India|India Headlines?)[:\s]*<br>/gi, '<strong class="block mt-3 mb-1">India Headlines:</strong><br>')
                .replace(/^(.*?):<br>/gm, '<strong class="block mt-3 mb-1">$1:</strong>');

            html += `<div class="mb-4">${formattedText}</div>`;
        } else {
            html += `<p>Could not retrieve any news data at this time.</p>`;
        }

        // Note: Perplexity API doesn't provide grounding metadata in the same format as Gemini
        // Sources are typically included in the response text itself
        const uniqueSources: any[] = [];
        if (uniqueSources.length > 0) {
            html += '<hr class="my-4 border-gray-300">';
            html += '<h4 class="text-md font-bold mb-2">Sources:</h4>';
            html += '<ul class="list-disc pl-5 text-sm space-y-1">';

            uniqueSources.forEach(chunk => {
                if (chunk && typeof chunk === 'object' && 'web' in chunk && chunk.web && typeof chunk.web === 'object' && 'uri' in chunk.web) {
                    const webChunk = chunk.web as { uri: string; title?: string };
                    html += `<li><a href="${webChunk.uri}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${webChunk.title || webChunk.uri}</a></li>`;
                }
            });
            html += '</ul>';
        }

        headlinesContent.innerHTML = html;

    } catch (error) {
        console.error("Error fetching World Order headlines:", error);
        headlinesContent.innerHTML = `<p>An API Error occurred. Could not fetch headlines at this time.</p>`;
    }
}
