import { ai } from "../api/gemini";

// Cache for philosophical quotes to avoid repeated API calls
const quoteCache = new Map<string, { quote: string; author: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function getPhilosophicalQuote(date: Date): Promise<{ quote: string; author: string }> {
    const dateKey = date.toISOString().split('T')[0];
    
    // Check cache first
    const cached = quoteCache.get(dateKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return { quote: cached.quote, author: cached.author };
    }
    
    if (!ai) {
        return {
            quote: "The unexamined life is not worth living.",
            author: "Socrates"
        };
    }
    
    try {
        const prompt = `Generate a profound, thought-provoking quote from a famous philosopher that would inspire deep reflection. The quote should be:
1. From a well-known philosopher (Socrates, Plato, Aristotle, Marcus Aurelius, Epictetus, Seneca, Nietzsche, Kant, etc.)
2. Profound and meaningful for daily reflection
3. 1-2 sentences maximum
4. Timeless and universally applicable
5. Format as: "Quote text" - Philosopher Name

Make it different from common quotes and choose something that would make someone pause and think deeply about life, wisdom, or human nature.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        const fullText = response.text.trim();
        const parts = fullText.split(' - ');
        
        if (parts.length >= 2) {
            const quote = parts[0].replace(/^["']|["']$/g, '').trim();
            const author = parts[1].trim();
            
            // Cache the result
            quoteCache.set(dateKey, {
                quote,
                author,
                timestamp: Date.now()
            });
            
            return { quote, author };
        } else {
            // Fallback if parsing fails
            return {
                quote: "The unexamined life is not worth living.",
                author: "Socrates"
            };
        }
    } catch (error) {
        console.error("Error generating philosophical quote:", error);
        return {
            quote: "The unexamined life is not worth living.",
            author: "Socrates"
        };
    }
}

export async function getReflectionPrompt(quote: string, author: string) {
    const reflectionPromptDisplay = document.getElementById('reflection-prompt-display-day');
    if (!reflectionPromptDisplay) return;
    
    if (!ai) {
        reflectionPromptDisplay.textContent = 'AI functionality is not available. Please check your API key configuration.';
        return;
    }
    
    reflectionPromptDisplay.textContent = 'Generating a reflection prompt...';
    try {
        const prompt = `Based on this philosophical quote: "${quote}" by ${author}, generate a short, insightful, and personal reflection question to help me think deeper about it. Frame it as a question I can ask myself. Do not use asterisks.`;
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
