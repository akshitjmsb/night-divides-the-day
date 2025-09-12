import { ai } from "../../api/gemini";

export async function fetchAndShowTennisMatches() {
    const modal = document.getElementById('tennis-modal');
    const contentEl = document.getElementById('tennis-content');
    if (!modal || !contentEl) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    contentEl.innerHTML = '<p>Searching the web for latest match information...</p>';

    try {
        const prompt = `CRITICAL: Use Google Search to find the MOST RECENT and CURRENT ATP & WTA singles matches for yesterday, today, and tomorrow. Double-check all dates to ensure you're providing the latest information. Focus on major tournaments and current events.

Show all ATP & WTA singles matches (yesterday, today, tomorrow) for major tournaments—include date, city, round, players, and results/times. Provide separate tables for men's and women's events. Highlight Canadian players, finals, and upsets. For each match, specify "Scheduled," "In progress," or "Completed," and list match start times if available.

IMPORTANT: Verify the current date and ensure all tournament information is from the most recent available data. Prioritize ongoing tournaments and upcoming matches.

Format the response as proper HTML tables with the following structure:

<h3>Men's Singles (ATP – [Tournament Name], [City], [Year])</h3>
<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
<thead>
<tr style="background-color: #f3f4f6;">
<th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Date</th>
<th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Round</th>
<th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Match</th>
<th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Result / Schedule</th>
<th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Time Slot</th>
</tr>
</thead>
<tbody>
<tr>
<td style="padding: 8px; border: 1px solid #d1d5db;">Aug 5, 2025</td>
<td style="padding: 8px; border: 1px solid #d1d5db;">Quarterfinal</td>
<td style="padding: 8px; border: 1px solid #d1d5db;">Taylor Fritz vs Andrey Rublev</td>
<td style="padding: 8px; border: 1px solid #d1d5db;"><span style="color: #16a34a;">Fritz</span> def. Rublev 6-3, 7-6(4)</td>
<td style="padding: 8px; border: 1px solid #d1d5db;">Afternoon (completed)</td>
</tr>
</tbody>
</table>

<h3>Women's Singles (WTA – [Tournament Name], [City], [Year])</h3>
<table border="1" style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
<thead>
<tr style="background-color: #f3f4f6;">
<th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Date</th>
<th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Round</th>
<th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Match</th>
<th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Result / Schedule</th>
<th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Time Slot</th>
</tr>
</thead>
<tbody>
<tr>
<td style="padding: 8px; border: 1px solid #d1d5db;">Aug 6, 2025</td>
<td style="padding: 8px; border: 1px solid #d1d5db;">Semifinal</td>
<td style="padding: 8px; border: 1px solid #d1d5db;">Victoria Mboko vs Elena Rybakina</td>
<td style="padding: 8px; border: 1px solid #d1d5db;"><span style="color: #16a34a;">Mboko</span> def. Rybakina 1-6, 7-5, 7-6(4)</td>
<td style="padding: 8px; border: 1px solid #d1d5db;">Day–Evening (completed)</td>
</tr>
</tbody>
</table>

Use actual current tournament data and highlight Canadian players with <strong> tags, finals with <em> tags, and upsets with <span style="color: #dc2626;"> tags. For completed matches, display the winner's name in green color using <span style="color: #16a34a;"> tags.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        let html = '';

        if (response.text) {
            html += `<div class="mb-4">${response.text}</div>`;
        } else {
            html += `<p>Could not retrieve any tennis data at this time.</p>`;
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
        console.error("Error fetching Tennis data:", error);
        contentEl.innerHTML = '<p>An API Error occurred. Could not fetch tennis information at this time.</p>';
    }
}
