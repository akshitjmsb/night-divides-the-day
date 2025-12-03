import { ai } from "../api/perplexity";
import { getCanonicalTime } from "../core/time";
import { getCachedContent, saveCachedContent } from "../core/supabase-content-cache";

// Quote generation time: 5 PM (17:00)
const QUOTE_GENERATION_HOUR = 17;

/**
 * Determines the quote date based on 5 PM cutoff.
 * If current time is >= 5 PM today, quote date is today.
 * If current time is < 5 PM today, quote date is yesterday.
 */
export function getQuoteDate(): Date {
    const { now, hour } = getCanonicalTime();
    const quoteDate = new Date(now);
    
    // If before 5 PM, use yesterday's date
    if (hour < QUOTE_GENERATION_HOUR) {
        quoteDate.setDate(now.getDate() - 1);
    }
    
    return quoteDate;
}

/**
 * Checks if it's time to generate a new quote (at or after 5 PM on quote date)
 */
export function shouldGenerateQuote(quoteDate: Date): boolean {
    const { now, hour } = getCanonicalTime();
    const quoteDateKey = quoteDate.toISOString().split('T')[0];
    const todayKey = now.toISOString().split('T')[0];
    
    // Only generate if:
    // 1. Today is the quote date AND
    // 2. Current hour is >= 5 PM
    return quoteDateKey === todayKey && hour >= QUOTE_GENERATION_HOUR;
}

/**
 * Checks if it's exactly 5 PM (within a 1-minute window for periodic checks)
 */
export function isQuoteGenerationTime(): boolean {
    const { now, hour } = getCanonicalTime();
    const minute = now.getMinutes();
    
    // Check if it's 5 PM (17:00) - allow a 1-minute window (17:00-17:01)
    return hour === QUOTE_GENERATION_HOUR && minute < 2;
}

/**
 * Counts words in a string
 */
function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Truncates quote to maximum 25 words
 */
function truncateToMaxWords(quote: string, maxWords: number = 25): string {
    const words = quote.trim().split(/\s+/);
    if (words.length <= maxWords) {
        return quote.trim();
    }
    return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Gets or generates the daily philosophical quote.
 * Quotes are generated at 5 PM and stay active until 5 PM next day.
 * Quotes are stored in Supabase and persist across sessions.
 */
export async function getOrGenerateDailyQuote(
    userId: string
): Promise<{ quote: string; author: string } | null> {
    const quoteDate = getQuoteDate();
    const dateKey = quoteDate.toISOString().split('T')[0];
    
    // 1. Check Supabase cache first
    const cached = await getCachedContent(userId, 'philosophical-quote', dateKey);
    if (cached && cached.quote && cached.author) {
        return { quote: cached.quote, author: cached.author };
    }
    
    // 2. If not cached and it's time to generate (>= 5 PM on quote date)
    if (!ai) {
        console.warn("Perplexity API not available. Cannot generate quote.");
        return null;
    }
    
    if (!shouldGenerateQuote(quoteDate)) {
        // Not time to generate yet, return null (will show loading/placeholder)
        console.log(`Not yet 5 PM. Quote will be generated at 5 PM on ${dateKey}`);
        return null;
    }
    
    // 3. Generate new quote via Perplexity API
    try {
        showQuoteLoadingIndicator();
        
        const prompt = `Generate a profound, thought-provoking quote from a famous philosopher that would inspire deep reflection. The quote must be:
1. From a well-known philosopher (Socrates, Plato, Aristotle, Marcus Aurelius, Epictetus, Seneca, Nietzsche, Kant, etc.)
2. Profound and meaningful for daily reflection
3. Maximum 25 words (count carefully)
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
            let quote = parts[0].replace(/^["']|["']$/g, '').trim();
            const author = parts[1].trim();
            
            // Ensure quote is max 25 words
            const wordCount = countWords(quote);
            if (wordCount > 25) {
                console.warn(`Quote has ${wordCount} words, truncating to 25`);
                quote = truncateToMaxWords(quote, 25);
            }
            
            const quoteData = { quote, author };
            
            // 4. Save to Supabase cache
            await saveCachedContent(userId, 'philosophical-quote', dateKey, quoteData);
            
            hideQuoteLoadingIndicator();
            return quoteData;
        } else {
            // Fallback if parsing fails
            console.error("Failed to parse quote response:", fullText);
            hideQuoteLoadingIndicator();
            return null;
        }
    } catch (error) {
        console.error("Error generating philosophical quote:", error);
        hideQuoteLoadingIndicator();
        return null;
    }
}

// Legacy functions for backward compatibility (deprecated)
const quoteCache = new Map<string, { quote: string; author: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Curated database of philosophical quotes for instant loading (fallback only)
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

function getCuratedQuote(date: Date): { quote: string; author: string } {
    const dateKey = date.toISOString().split('T')[0];
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const quoteIndex = dayOfYear % CURATED_QUOTES.length;
    return CURATED_QUOTES[quoteIndex];
}

// Legacy function - deprecated, use getOrGenerateDailyQuote instead
export function getPhilosophicalQuoteInstant(date: Date): { quote: string; author: string } {
    const dateKey = date.toISOString().split('T')[0];
    const cached = quoteCache.get(dateKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        return { quote: cached.quote, author: cached.author };
    }
    return getCuratedQuote(date);
}

// Legacy function - deprecated, use getOrGenerateDailyQuote instead
export async function generateAIPhilosophicalQuote(date: Date): Promise<{ quote: string; author: string }> {
    const dateKey = date.toISOString().split('T')[0];
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
            quoteCache.set(dateKey, { quote, author, timestamp: Date.now() });
            return { quote, author };
        } else {
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
