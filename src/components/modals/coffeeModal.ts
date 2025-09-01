import { ai } from "../../api/gemini";
import { getDayOfYear } from "../../utils/date";
import { escapeHtml } from "../../utils/escapeHtml";

export async function fetchAndShowCoffeeTip(activeContentDate: Date) {
    const modal = document.getElementById('coffee-modal');
    const contentEl = document.getElementById('coffee-content');
    if (!modal || !contentEl) return;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    contentEl.innerHTML = '<p>Loading today\'s coffee lesson...</p>';

    if (!ai) {
        contentEl.innerHTML = '<p>AI functionality is not available. Please check your API key configuration.</p>';
        return;
    }
    
    let coffeeData;
    try {
        const dayOfYear = getDayOfYear(activeContentDate);
        const prompt = `For day ${dayOfYear} of the year, generate a unique, self-contained mini-lesson for someone aspiring to open their own coffee cafe. The lesson should cover a practical aspect of the coffee industry, market, or business operations. Provide a clear title, a detailed but accessible explanation, and a single key takeaway for a future cafe owner. Do not use asterisks or markdown.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        title: {
                            type: "STRING",
                            description: 'The title of the coffee industry lesson.'
                        },
                        explanation: {
                            type: "STRING",
                            description: 'A detailed explanation of the topic.'
                        },
                        takeaway: {
                            type: "STRING",
                            description: 'A single, actionable takeaway for a future cafe owner.'
                        }
                    },
                    required: ["title", "explanation", "takeaway"]
                } as any,
            }
        });

        try {
            coffeeData = JSON.parse(response.text);
        } catch (jsonError) {
             console.error("Failed to parse JSON from Gemini response for coffee lesson:", jsonError);
             contentEl.innerHTML = `<p>Could not parse the lesson. Please try again later.</p>`;
             return;
        }

    } catch (error) {
        console.error("Error fetching Coffee Lesson:", error);
        contentEl.innerHTML = '<p>Could not retrieve a coffee lesson at this time.</p>';
        return;
    }

    if (coffeeData && coffeeData.title && coffeeData.explanation && coffeeData.takeaway) {
         contentEl.innerHTML = `
            <h4 class="font-bold text-md mb-2">${escapeHtml(coffeeData.title)}</h4>
            <p class="text-base mb-4">${escapeHtml(coffeeData.explanation)}</p>
            <div class="mt-4 pt-4 border-t border-gray-200">
                <p class="text-sm font-bold">Key Takeaway:</p>
                <p class="text-sm italic">${escapeHtml(coffeeData.takeaway)}</p>
            </div>
        `;
    } else {
         contentEl.innerHTML = '<p>Could not retrieve a coffee lesson. The response was empty.</p>';
    }
}
