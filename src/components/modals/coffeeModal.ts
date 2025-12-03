import { ai } from "../../api/perplexity";
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
            model: 'sonar-pro',
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
            // Try to extract JSON from response if it's wrapped in markdown or text
            let jsonText = response.text.trim();
            
            // Remove markdown code blocks if present
            jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
            
            // Try to parse JSON
            coffeeData = JSON.parse(jsonText);
        } catch (jsonError) {
             console.error("Failed to parse JSON from Perplexity response for coffee lesson:", jsonError);
             console.error("Response text:", response.text);
             // Try to extract JSON object from text
             const jsonMatch = response.text.match(/\{[\s\S]*\}/);
             if (jsonMatch) {
                 try {
                     coffeeData = JSON.parse(jsonMatch[0]);
                 } catch (secondError) {
                     console.error("Failed to parse extracted JSON:", secondError);
                     contentEl.innerHTML = `<p>Could not parse the lesson. Please try again later.</p>`;
                     return;
                 }
             } else {
                 contentEl.innerHTML = `<p>Could not parse the lesson. Please try again later.</p>`;
                 return;
             }
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
