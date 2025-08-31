import { ai } from "../../api/gemini";
import { escapeHtml } from "../../utils/escapeHtml";

export async function getSolutionExplanation(questionPrompt: string, questionSolution: string): Promise<string> {
    try {
        const prompt = `You are an expert cloud analytics engineering mentor. A junior engineer has the following question and provided solution.

**Question:**
${questionPrompt}

**Solution:**
\`\`\`sql
${questionSolution}
\`\`\`

Your task is to explain this to the junior engineer. Provide a response in JSON format with the following keys: "problemExplanation", "professionalApproach", and "formattedSolution".
1.  **problemExplanation**: Briefly explain what the problem is asking for in simple terms.
2.  **professionalApproach**: Describe how a professional cloud analytics engineer would think about and approach solving this problem. Discuss best practices, potential edge cases, performance considerations, or alternative methods they might consider.
3.  **formattedSolution**: Present the original solution code, correctly formatted.`;

        const responseSchema = {
            type: "OBJECT",
            properties: {
                problemExplanation: {
                    type: "STRING",
                    description: "An explanation of what the problem is asking."
                },
                professionalApproach: {
                    type: "STRING",
                    description: "How a professional would approach the problem, including best practices."
                },
                formattedSolution: {
                    type: "STRING",
                    description: "The original solution code, formatted."
                }
            },
            required: ["problemExplanation", "professionalApproach", "formattedSolution"]
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema as any, // Cast to any to avoid type errors with the SDK
            },
        });

        const data = JSON.parse(response.text);

        const problemExplanationHtml = data.problemExplanation.replace(/\n/g, '<br>');
        const professionalApproachHtml = data.professionalApproach.replace(/\n/g, '<br>');

        return `
            <div class="space-y-4">
                <div>
                    <h5 class="font-bold text-sm mb-1">Understanding the Problem</h5>
                    <p class="text-sm">${problemExplanationHtml}</p>
                </div>
                <div>
                    <h5 class="font-bold text-sm mb-1">Professional Approach</h5>
                    <p class="text-sm">${professionalApproachHtml}</p>
                </div>
                <div>
                    <h5 class="font-bold text-sm mb-1">Solution Code</h5>
                    <div class="bg-gray-100 p-3 rounded-md text-sm"><pre class="text-gray-800">${escapeHtml(data.formattedSolution)}</pre></div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error("Error generating solution explanation:", error);
        return `<h5 class="font-bold text-sm mb-1">Solution Code</h5>
                <div class="bg-gray-100 p-3 rounded-md text-sm"><pre class="text-gray-800">${escapeHtml(questionSolution)}</pre></div>
                <p class="text-xs text-red-500 mt-2">Could not generate a detailed explanation. Displaying original solution.</p>`;
    }
}
