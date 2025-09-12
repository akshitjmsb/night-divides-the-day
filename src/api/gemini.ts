import { GoogleGenAI, Type } from "@google/genai";
import { ErrorHandler, ErrorType, withErrorHandling } from "../utils/errorHandling";

const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY) as string;
let ai: any = null;

if (apiKey && apiKey !== 'test_key_for_development') {
    try {
        ai = new GoogleGenAI({apiKey: apiKey});
    } catch (error) {
        console.warn("Failed to initialize Gemini API:", error);
        ai = null;
    }
} else {
    console.warn("Using development mode without Gemini API key");
    ai = null;
}

export { ai };

const CLOUD_CACHE_BASE_URL = 'https://kvdb.io/akki-boy-dashboard-cache';

// Helper function to determine workout type based on day of week
function getWorkoutType(dayOfWeek: number): string {
    // 4-day schedule: Push, Pull, Legs, Rest
    // Monday: Push, Tuesday: Pull, Wednesday: Legs, Thursday: Rest, Friday: Push, Saturday: Pull, Sunday: Legs
    const schedule = ['Legs', 'Push', 'Pull', 'Legs', 'Rest', 'Push', 'Pull'];
    return schedule[dayOfWeek];
}

export async function getOrGenerateDynamicContent(contentType: 'analytics' | 'transportation-physics' | 'french-sound' | 'classic-rock-500' | 'exercise-plan', date: Date): Promise<any> {
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

export async function generateDynamicContent(contentType: 'analytics' | 'transportation-physics' | 'french-sound' | 'classic-rock-500' | 'exercise-plan', dateKey: string): Promise<any> {
    // If no API key, return fallback content
    if (!ai) {
        return getFallbackContent(contentType, dateKey);
    }
    
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
    } else if (contentType === 'exercise-plan') {
        const dayOfWeek = new Date(dateKey).getDay();
        const workoutType = getWorkoutType(dayOfWeek);
        
        prompt = `Generate a comprehensive ${workoutType} workout plan for ${dateKey}. Create a 4-day weekly schedule with Push/Pull/Legs rotation. For the specific day, provide detailed exercises with proper form instructions, sets, reps, and rest periods. Focus on compound movements and progressive overload. Include muscle groups targeted and practical tips for each exercise.`;
        
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                push: {
                    type: Type.OBJECT,
                    properties: {
                        exercises: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    muscleGroup: { type: Type.STRING },
                                    sets: { type: Type.STRING },
                                    reps: { type: Type.STRING },
                                    rest: { type: Type.STRING },
                                    instructions: { type: Type.STRING },
                                    tips: { type: Type.STRING }
                                },
                                required: ["name", "muscleGroup", "sets", "reps", "rest", "instructions"]
                            }
                        },
                        notes: { type: Type.STRING }
                    },
                    required: ["exercises"]
                },
                pull: {
                    type: Type.OBJECT,
                    properties: {
                        exercises: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    muscleGroup: { type: Type.STRING },
                                    sets: { type: Type.STRING },
                                    reps: { type: Type.STRING },
                                    rest: { type: Type.STRING },
                                    instructions: { type: Type.STRING },
                                    tips: { type: Type.STRING }
                                },
                                required: ["name", "muscleGroup", "sets", "reps", "rest", "instructions"]
                            }
                        },
                        notes: { type: Type.STRING }
                    },
                    required: ["exercises"]
                },
                legs: {
                    type: Type.OBJECT,
                    properties: {
                        exercises: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    muscleGroup: { type: Type.STRING },
                                    sets: { type: Type.STRING },
                                    reps: { type: Type.STRING },
                                    rest: { type: Type.STRING },
                                    instructions: { type: Type.STRING },
                                    tips: { type: Type.STRING }
                                },
                                required: ["name", "muscleGroup", "sets", "reps", "rest", "instructions"]
                            }
                        },
                        notes: { type: Type.STRING }
                    },
                    required: ["exercises"]
                },
                rest: {
                    type: Type.OBJECT,
                    properties: {
                        activities: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        notes: { type: Type.STRING }
                    },
                    required: ["activities"]
                }
            },
            required: ["push", "pull", "legs", "rest"]
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
        const appError = ErrorHandler.handleApiError(error, `Content generation for ${contentType}`);
        ErrorHandler.logError(appError);
        // Don't show user error for background content generation
        return null;
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
    // If no API key, return fallback food plan
    if (!ai) {
        return getFallbackFoodPlan(date);
    }
    
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
        const appError = ErrorHandler.handleApiError(error, 'Food plan generation');
        ErrorHandler.logError(appError);
        return "Could not generate a food plan at this time.";
    }
}

// Fallback content for development mode
function getFallbackContent(contentType: 'analytics' | 'transportation-physics' | 'french-sound' | 'classic-rock-500' | 'exercise-plan', dateKey: string): any {
    if (contentType === 'analytics') {
        return {
            sql: {
                title: "Sample SQL Challenge",
                prompt: "Write a query to find the top 10 customers by total purchase amount.",
                solution: "SELECT customer_id, SUM(amount) as total_purchase FROM orders GROUP BY customer_id ORDER BY total_purchase DESC LIMIT 10;"
            },
            dax: {
                title: "Sample DAX Challenge",
                prompt: "Create a measure to calculate year-over-year growth.",
                solution: "YoY Growth = DIVIDE([Current Year Sales] - [Previous Year Sales], [Previous Year Sales])"
            },
            snowflake: {
                title: "Sample Snowflake Challenge",
                prompt: "How do you handle time travel in Snowflake?",
                solution: "Use AT or BEFORE clauses with timestamps to query historical data."
            },
            dbt: {
                title: "Sample dbt Challenge",
                prompt: "Create a model that transforms raw data into a clean fact table.",
                solution: "Use incremental models with proper tests and documentation."
            },
            dataManagement: {
                title: "Data Governance",
                explanation: "Data governance ensures data quality, security, and compliance across the organization."
            },
            dataQuality: {
                title: "String Data Quality Issues",
                dataType: "String (VARCHAR)",
                issues: ["Null values", "Empty strings", "Inconsistent formatting", "Special characters"],
                transformations: ["COALESCE to handle nulls", "TRIM to remove whitespace", "UPPER/LOWER for consistency", "REGEXP_REPLACE for special chars"]
            }
        };
    } else if (contentType === 'transportation-physics') {
        return {
            title: "How Airplane Wings Work",
            explanation: "Airplane wings create lift by creating a pressure difference. Air moves faster over the top of the wing, creating lower pressure, while slower air underneath creates higher pressure, pushing the wing upward."
        };
    } else if (contentType === 'french-sound') {
        return {
            sound: "on",
            words: [
                { word: "bon", cue: "like 'bone'", meaning: "good" },
                { word: "mon", cue: "like 'moan'", meaning: "my" },
                { word: "ton", cue: "like 'tone'", meaning: "your" },
                { word: "son", cue: "like 'sown'", meaning: "his/her" },
                { word: "non", cue: "like 'known'", meaning: "no" },
                { word: "don", cue: "like 'dawn'", meaning: "gift" },
                { word: "pont", cue: "like 'pawn'", meaning: "bridge" },
                { word: "front", cue: "like 'frawn'", meaning: "front" },
                { word: "mont", cue: "like 'mawn'", meaning: "mountain" },
                { word: "compte", cue: "like 'kawn'", meaning: "account" }
            ]
        };
    } else if (contentType === 'exercise-plan') {
        const dayOfWeek = new Date(dateKey).getDay();
        const workoutType = getWorkoutType(dayOfWeek);
        
        return {
            push: {
                exercises: [
                    {
                        name: "Bench Press",
                        muscleGroup: "Chest, Shoulders, Triceps",
                        sets: "4",
                        reps: "8-10",
                        rest: "90s",
                        instructions: "Lie on bench, grip bar slightly wider than shoulders, lower to chest, press up explosively",
                        tips: "Keep core tight, maintain neutral spine"
                    },
                    {
                        name: "Overhead Press",
                        muscleGroup: "Shoulders, Triceps",
                        sets: "3",
                        reps: "8-12",
                        rest: "60s",
                        instructions: "Stand with feet hip-width, press weight overhead, lower to shoulders",
                        tips: "Engage core, avoid arching back"
                    },
                    {
                        name: "Dips",
                        muscleGroup: "Chest, Triceps",
                        sets: "3",
                        reps: "8-15",
                        rest: "60s",
                        instructions: "Support body on bars, lower until shoulders below elbows, press up",
                        tips: "Lean slightly forward for chest emphasis"
                    }
                ],
                notes: "Focus on compound movements for maximum muscle activation"
            },
            pull: {
                exercises: [
                    {
                        name: "Pull-ups",
                        muscleGroup: "Lats, Biceps, Rear Delts",
                        sets: "4",
                        reps: "5-10",
                        rest: "90s",
                        instructions: "Hang from bar, pull body up until chin over bar, lower with control",
                        tips: "Use full range of motion, engage lats"
                    },
                    {
                        name: "Bent-over Rows",
                        muscleGroup: "Lats, Rhomboids, Biceps",
                        sets: "3",
                        reps: "8-12",
                        rest: "60s",
                        instructions: "Hinge at hips, row weight to lower chest, squeeze shoulder blades",
                        tips: "Keep back straight, core engaged"
                    },
                    {
                        name: "Face Pulls",
                        muscleGroup: "Rear Delts, Rhomboids",
                        sets: "3",
                        reps: "12-15",
                        rest: "45s",
                        instructions: "Pull cable to face, separate hands at face level",
                        tips: "Focus on external rotation"
                    }
                ],
                notes: "Emphasize pulling movements to balance pushing exercises"
            },
            legs: {
                exercises: [
                    {
                        name: "Squats",
                        muscleGroup: "Quads, Glutes, Hamstrings",
                        sets: "4",
                        reps: "8-12",
                        rest: "90s",
                        instructions: "Stand with feet shoulder-width, lower until thighs parallel, drive up through heels",
                        tips: "Keep chest up, knees tracking over toes"
                    },
                    {
                        name: "Romanian Deadlifts",
                        muscleGroup: "Hamstrings, Glutes",
                        sets: "3",
                        reps: "8-10",
                        rest: "90s",
                        instructions: "Hinge at hips, lower weight along legs, feel stretch in hamstrings",
                        tips: "Keep back straight, slight knee bend"
                    },
                    {
                        name: "Walking Lunges",
                        muscleGroup: "Quads, Glutes, Hamstrings",
                        sets: "3",
                        reps: "10 each leg",
                        rest: "60s",
                        instructions: "Step forward into lunge, push back to standing, alternate legs",
                        tips: "Keep torso upright, control the movement"
                    }
                ],
                notes: "Focus on proper form and full range of motion"
            },
            rest: {
                activities: [
                    "Light stretching or yoga",
                    "Walking or light cardio",
                    "Foam rolling",
                    "Meditation or relaxation"
                ],
                notes: "Active recovery helps with muscle repair and reduces soreness"
            }
        };
    }
    return null;
}

function getFallbackFoodPlan(date: Date): string {
    const dayOfWeek = date.getDay();
    const isNoMeatDay = dayOfWeek === 2 || dayOfWeek === 4;
    
    if (isNoMeatDay) {
        return `Breakfast: Oatmeal with berries, nuts, and cinnamon
Lunch: Quinoa salad with avocado, leafy greens, and olive oil
Dinner: Grilled salmon with steamed vegetables
Snack: Dark chocolate and mixed nuts`;
    } else {
        return `Breakfast: Scrambled eggs with spinach and avocado
Lunch: Grilled chicken with mixed greens and olive oil dressing
Dinner: Lean beef stir-fry with vegetables
Snack: Berries with Greek yogurt`;
    }
}
