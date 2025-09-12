import { ai } from "../api/gemini";

export async function getReflectionPrompt(pointer: string) {
    const reflectionPromptDisplay = document.getElementById('reflection-prompt-display-day');
    if (!reflectionPromptDisplay) return;
    
    if (!ai) {
        reflectionPromptDisplay.textContent = 'AI functionality is not available. Please check your API key configuration.';
        return;
    }
    
    reflectionPromptDisplay.textContent = 'Generating a reflection prompt...';
    try {
        const prompt = `Based on the life pointer "${pointer}", generate a short, insightful, and personal reflection question to help me think deeper about it. Frame it as a question I can ask myself. Do not use asterisks.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        reflectionPromptDisplay.textContent = response.text.replace(/\*/g, '');
    } catch (error) {
        console.error("Error generating reflection prompt:", error);
        reflectionPromptDisplay.textContent = 'Could not generate a prompt. Please try again.';
    }
}
