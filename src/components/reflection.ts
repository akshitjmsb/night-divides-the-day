import { ai } from "../api/perplexity";

// Cache for philosophical quotes to avoid repeated API calls
const quoteCache = new Map<string, { quote: string; author: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Curated database of philosophical quotes for instant loading
const CURATED_QUOTES = [
    { quote: "The unexamined life is not worth living.", author: "Socrates" },
    { quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
    { quote: "The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion.", author: "Albert Camus" },
    { quote: "Man is born free, and everywhere he is in chains.", author: "Jean-Jacques Rousseau" },
    { quote: "I think, therefore I am.", author: "René Descartes" },
    { quote: "The mind is everything. What you think you become.", author: "Buddha" },
    { quote: "Life is what happens to you while you're busy making other plans.", author: "John Lennon" },
    { quote: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
    { quote: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.", author: "Ralph Waldo Emerson" },
    { quote: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
    { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { quote: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
    { quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
    { quote: "Don't be pushed around by the fears in your mind. Be led by the dreams in your heart.", author: "Roy T. Bennett" },
    { quote: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
    { quote: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
    { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { quote: "Your limitation—it's only your imagination.", author: "Unknown" },
    { quote: "Great things never come from comfort zones.", author: "Unknown" },
    { quote: "Dream it. Wish it. Do it.", author: "Unknown" },
    { quote: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
    { quote: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
    { quote: "Dream bigger. Do bigger.", author: "Unknown" },
    { quote: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
    { quote: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
    { quote: "Do something today that your future self will thank you for.", author: "Unknown" },
    { quote: "Little things make big days.", author: "Unknown" },
    { quote: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
    { quote: "Don't wait for opportunity. Create it.", author: "Unknown" },
    { quote: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", author: "Unknown" }
];

// Get a deterministic quote based on date for consistency
function getCuratedQuote(date: Date): { quote: string; author: string } {
    const dateKey = date.toISOString().split('T')[0];
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const quoteIndex = dayOfYear % CURATED_QUOTES.length;
    return CURATED_QUOTES[quoteIndex];
}

// Instant quote loading - returns immediately with curated content
export function getPhilosophicalQuoteInstant(date: Date): { quote: string; author: string } {
    const dateKey = date.toISOString().split('T')[0];
    
    // Check cache first
    const cached = quoteCache.get(dateKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return { quote: cached.quote, author: cached.author };
    }
    
    // Return curated quote instantly
    return getCuratedQuote(date);
}

// Background AI quote generation - doesn't block the UI
export async function generateAIPhilosophicalQuote(date: Date): Promise<{ quote: string; author: string }> {
    const dateKey = date.toISOString().split('T')[0];
    
    // Check cache first
    const cached = quoteCache.get(dateKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return { quote: cached.quote, author: cached.author };
    }
    
    if (!ai) {
        return getCuratedQuote(date);
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
            model: 'sonar-pro',
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
            return getCuratedQuote(date);
        }
    } catch (error) {
        console.error("Error generating philosophical quote:", error);
        return getCuratedQuote(date);
    }
}

// Show a subtle loading indicator for AI quote generation
export function showQuoteLoadingIndicator() {
    const lifePointerEl = document.getElementById('life-pointer-display-day');
    if (lifePointerEl) {
        const loadingIndicator = lifePointerEl.querySelector('.loading-indicator');
        if (!loadingIndicator) {
            const indicator = document.createElement('div');
            indicator.className = 'loading-indicator text-xs text-gray-500 mt-2 opacity-70';
            indicator.textContent = '✨ Generating personalized quote...';
            lifePointerEl.appendChild(indicator);
        }
    }
}

// Hide the loading indicator
export function hideQuoteLoadingIndicator() {
    const lifePointerEl = document.getElementById('life-pointer-display-day');
    if (lifePointerEl) {
        const loadingIndicator = lifePointerEl.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }
}

// Legacy function for backward compatibility - now uses instant loading
export async function getPhilosophicalQuote(date: Date): Promise<{ quote: string; author: string }> {
    return getPhilosophicalQuoteInstant(date);
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
            model: 'sonar-pro',
            contents: prompt,
        });
        reflectionPromptDisplay.textContent = response.text.replace(/\*/g, '');
    } catch (error) {
        console.error("Error generating reflection prompt:", error);
        reflectionPromptDisplay.textContent = 'Could not generate a prompt. Please try again.';
    }
}
