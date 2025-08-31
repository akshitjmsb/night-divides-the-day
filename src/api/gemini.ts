import { GoogleGenAI, Type } from "@google/genai";

const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY) as string;
if (!apiKey) {
    console.error("API Key is missing! Make sure VITE_GEMINI_API_KEY is set in your .env file.");
}
export const ai = new GoogleGenAI({apiKey: apiKey!});

const CLOUD_CACHE_BASE_URL = 'https://kvdb.io/akki-boy-dashboard-cache';

export async function getOrGenerateDynamicContent(contentType: 'analytics' | 'transportation-physics' | 'french-sound' | 'classic-rock-500', date: Date): Promise<any> {
    const dateKey = date.toISOString().split('T')[0];
    const localKey = `dynamic-content-${contentType}-${dateKey}`;
    const cloudKey = `${contentType}-${dateKey}`;

    // 1. Check local cache first for speed
    try {
        const storedContent = localStorage.getItem(localKey);
        if (storedContent) {
            return JSON.parse(storedContent);
        }
    } catch (e) {
        console.error("Error reading from localStorage", e);
        localStorage.removeItem(localKey);
    }

    // 2. If not in local cache, check the shared cloud cache
    try {
        const response = await fetch(`${CLOUD_CACHE_BASE_URL}/${cloudKey}`);
        if (response.ok) {
            const responseText = await response.text();
            if (responseText) {
                try {
                    const cloudContent = JSON.parse(responseText);
                    if (cloudContent) {
                        localStorage.setItem(localKey, JSON.stringify(cloudContent));
                        return cloudContent;
                    }
                } catch (jsonError) {
                    console.warn(`Failed to parse cloud content for ${contentType}. Not valid JSON.`, jsonError);
                }
            }
        }
    } catch(e) {
        console.warn("Could not fetch from cloud cache. Will try to generate.", e);
    }

    // 3. If not in any cache, generate new content
    console.log(`Generating new content for ${contentType} on ${dateKey} as it was not found in any cache.`);
    const generatedContent = await generateDynamicContent(contentType, dateKey);

    if (generatedContent) {
        // 4. Save to both caches for future requests
        localStorage.setItem(localKey, JSON.stringify(generatedContent));
        try {
            await fetch(`${CLOUD_CACHE_BASE_URL}/${cloudKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(generatedContent),
            });
        } catch (e) {
            console.error("Error saving content to caches", e);
        }
    }
    return generatedContent;
}

export async function generateDynamicContent(contentType: 'analytics' | 'transportation-physics' | 'french-sound' | 'classic-rock-500', dateKey: string): Promise<any> {
    let prompt = '';
    let responseSchema: any = {};

    if (contentType === 'analytics') {
        prompt = `Generate a unique, new set of daily technical topics for an analytics engineer for the date ${dateKey}. Provide one SQL question, one DAX question, one Snowflake question, one dbt question, one explanation of a DMBOK data management concept, and one topic on data quality. For the Data Quality topic, focus on a common column data type (e.g., String, Numeric, Datetime), list 3-4 potential data quality issues found in such columns, and describe common data transformations to correct them in a big data context. Each question must include a title, a prompt/problem description, and a concise solution. The DMBOK and Data Quality explanations must have a title and a detailed explanation. Ensure the content is different from other days.`;
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                sql: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, prompt: { type: Type.STRING }, solution: { type: Type.STRING } }, required: ["title", "prompt", "solution"] },
                dax: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, prompt: { type: Type.STRING }, solution: { type: Type.STRING } }, required: ["title", "prompt", "solution"] },
                snowflake: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, prompt: { type: Type.STRING }, solution: { type: Type.STRING } }, required: ["title", "prompt", "solution"] },
                dbt: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, prompt: { type: Type.STRING }, solution: { type: Type.STRING } }, required: ["title", "prompt", "solution"] },
                dataManagement: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, explanation: { type: Type.STRING } }, required: ["title", "explanation"] },
                dataQuality: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "Title of the data quality topic, e.g., 'Handling String Data Quality Issues'." },
                        dataType: { type: Type.STRING, description: "The data type being discussed, e.g., 'String (VARCHAR)'." },
                        issues: {
                            type: Type.ARRAY,
                            description: "A list of potential data quality issues.",
                            items: { type: Type.STRING }
                        },
                        transformations: {
                            type: Type.ARRAY,
                            description: "A list of data transformations to correct the issues.",
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["title", "dataType", "issues", "transformations"]
                }
            },
            required: ["sql", "dax", "snowflake", "dbt", "dataManagement", "dataQuality"]
        };
    } else if (contentType === 'transportation-physics') {
        prompt = `For the date ${dateKey}, explain a single, fundamental physics principle behind a common mode of transportation (like a car, bike, or plane). The goal is to explain the working principle to a layman at a very conceptual level. Use simple analogies and avoid technical jargon or formulas. The topic must be unique and different from other days. For example, you could explain how airplane wings generate lift conceptually, why tires need tread, or the basic idea behind regenerative braking. Provide a title and an explanation that is extremely easy to understand for someone with no physics background.`;
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                explanation: { type: Type.STRING }
            },
            required: ["title", "explanation"]
        };
    } else if (contentType === 'french-sound') {
        prompt = `Act as a French phonetics teacher planning a long-term course. For the date ${dateKey}, create a self-contained lesson for a single, unique French phoneme. The series of lessons over many days should eventually cover all phonemes of the French language in a logical progression. The content for this single day must be unique. Provide: 1. The target sound (e.g., 'an', 'in', 'ou' or an IPA symbol). 2. A list of exactly 10 example words that use this sound. For each word, provide the French word, a simple phonetic cue for an English speaker, and its English meaning. Do not use markdown.`;
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                sound: { type: Type.STRING, description: "The French sound being taught, e.g., 'on', 'u'." },
                words: {
                    type: Type.ARRAY,
                    description: "A list of 10 example words.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING, description: "The French word." },
                            cue: { type: Type.STRING, description: "A simple phonetic cue for English speakers." },
                            meaning: { type: Type.STRING, description: "The English meaning of the word." }
                        },
                        required: ["word", "cue", "meaning"]
                    }
                }
            },
            required: ["sound", "words"]
        };
    } else if (contentType === 'classic-rock-500') {
        // Request a 500 entry pool of classic rock songs
        prompt = `Generate a JSON array of exactly 500 items. Each item must have two string fields: title and artist. The list should be classic rock (and closely related rock) songs that are well-known/popular for guitar learners. Keep it diverse across decades and artists; avoid duplicates. Return JSON only.`;
        responseSchema = {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    artist: { type: Type.STRING }
                },
                required: ['title', 'artist']
            }
        };
    } else {
        return null;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
            },
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error(`Error generating content for ${contentType}:`, error);
        return null; // Return null on error
    }
}

async function fetchServerContent(dateKey: string): Promise<any | null> {
    try {
        const res = await fetch(`/api/content?date=${encodeURIComponent(dateKey)}`);
        if (!res.ok) return null;
        const json = await res.json();
        return json?.data ?? null;
    } catch (e) {
        console.warn('Server content fetch failed', e);
        return null;
    }
}

export async function getOrGeneratePlanForDate(date: Date, dateKey: string): Promise<string> {
    const localKey = `food-plan-${dateKey}`;
    const cloudKey = `food-plan-${dateKey}`;

    // 1. Check local cache
    try {
        const localPlan = localStorage.getItem(localKey);
        if (localPlan) {
            return localPlan;
        }
    } catch (e) {
        console.error("Error reading food plan from localStorage", e);
        localStorage.removeItem(localKey);
    }

    // 2. Check server KV via API
    try {
        const server = await fetchServerContent(dateKey);
        if (server && typeof server === 'object' && 'summary' in server) {
            const summary = (server as any).summary as string;
            if (summary && typeof summary === 'string') {
                localStorage.setItem(localKey, summary);
                return summary;
            }
        }
    } catch (e) {
        console.warn('Could not fetch from server content API.', e);
    }

    // 3. Generate new plan
    console.log(`Generating new food plan for ${dateKey} as it was not found in cache.`);
    const newPlan = await generateFoodPlanForDate(date);

    if (newPlan && !newPlan.startsWith("Could not generate")) {
        // 4. Save to both caches
        localStorage.setItem(localKey, newPlan);
        try {
            await fetch(`${CLOUD_CACHE_BASE_URL}/${cloudKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: newPlan }),
            });
        } catch (e) {
            console.error("Error saving food plan to cloud cache", e);
        }
    }

    return newPlan;
}

export async function generateFoodPlanForDate(date: Date): Promise<string> {
    const dayOfWeek = date.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    let prompt = `Create a full-day meal plan using only whole, minimally processed foods that naturally support libido. Format the output as a simple, scannable list with clear headings (Breakfast, Lunch, Dinner, Snack). Be very concise. Prioritize ingredients known to boost sexual health: oysters, leafy greens, avocados, nuts, dark chocolate, berries, watermelon, olive oil, eggs, fatty fish, ginger, cinnamon. Avoid processed foods, refined sugar, and alcohol. Do not use any markdown formatting like asterisks.`;

    // Day 2 (Tuesday) and 4 (Thursday) are no-meat days
    if (dayOfWeek === 2 || dayOfWeek === 4) {
        prompt += ' Avoid all meat (including poultry and red meat), but allow seafood, eggs, and plant-based protein.';
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        const text = response.text.replace(/\*/g, '');
        return text || "Could not generate a food plan. The response was empty.";
    } catch (error) {
        console.error("Error fetching food plan:", error);
        return "Could not generate a food plan at this time.";
    }
}
