import { ErrorHandler } from "../utils/errorHandling";
import { getCachedContent, saveCachedContent, getCachedFoodPlan, saveFoodPlan } from "../core/supabase-content-cache";

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
// API Key moved to server-side (only available in Vercel Function)
// const apiKey = (import.meta.env.VITE_PERPLEXITY_API_KEY || import.meta.env.VITE_API_KEY) as string;

const PERPLEXITY_PROXY_URL = '/api/perplexity-proxy';

// let hasApiKey = false;

// if (apiKey && apiKey !== 'test_key_for_development') {
//     hasApiKey = true;
// } else {
//     console.warn("Using development mode without Perplexity API key");
//     hasApiKey = false;
// }

/**
 * Call Perplexity API with a prompt
 */
async function callPerplexityAPI(
    prompt: string,
    options: {
        model?: string;
        responseFormat?: 'json_object' | 'text';
        temperature?: number;
    } = {}
): Promise<string> {
    // if (!hasApiKey) {
    //     throw new Error('Perplexity API key not configured');
    // }

    const {
        model = 'sonar',
        responseFormat = 'text',
        temperature = 0.7
    } = options;

    try {
        const requestBody: any = {
            prompt,
            options: {
                model,
                responseFormat,
                temperature
            }
        };

        // Perplexity API doesn't support response_format like OpenAI
        // JSON responses are handled via prompt instructions and parsing
        // No need to set response_format

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        try {
            const response = await fetch(PERPLEXITY_PROXY_URL, {
                method: 'POST',
                headers: {
                    // 'Authorization': `Bearer ${apiKey}`, // API key handled by proxy
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            // Helper function removed as logic is now in the proxy
            return data.choices[0]?.message?.content || '';
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    } catch (error) {
        console.error('Perplexity API call failed:', error);
        throw error;
    }
}

// Export a simple AI object for compatibility with existing code
export const ai = {
    models: {
        generateContent: async (params: { model?: string; contents: string; config?: any }) => {
            const prompt = params.contents;
            // Perplexity doesn't support response_format, so we always get text
            // If JSON is requested, we parse it from the text response
            const expectsJson = params.config?.responseMimeType === 'application/json';
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

                try {
                    const response = await fetch(PERPLEXITY_PROXY_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            prompt: params.contents,
                            options: {
                                model: params.model || 'sonar',
                                responseFormat: expectsJson ? 'json_object' : 'text' // Pass responseFormat to proxy
                            }
                        }),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        throw new Error(`Proxy error! status: ${response.status}`);
                    }

                    const data = await response.json();

                    // Return in format compatible with existing code
                    return {
                        text: data.choices[0].message.content
                    };
                } catch (error) {
                    clearTimeout(timeoutId);
                    throw error;
                }
            } catch (error) {
                console.error("Error calling Perplexity Proxy:", error);
                throw error;
            }
        }
    }
};

// Helper function to determine workout type based on day of week
function getWorkoutType(dayOfWeek: number): string {
    // 4-day schedule: Monday, Wednesday, Friday, Saturday
    // Monday: Push, Wednesday: Pull, Friday: Legs, Saturday: Upper Body
    // Tuesday, Thursday, Sunday: Rest days
    const schedule = ['rest', 'push', 'rest', 'pull', 'rest', 'legs', 'upper'];
    return schedule[dayOfWeek];
}

export async function getOrGenerateDynamicContent(
    userId: string,
    contentType: 'analytics' | 'transportation-physics' | 'french-sound' | 'classic-rock-500' | 'exercise-plan',
    date: Date
): Promise<any> {
    const dateKey = date.toISOString().split('T')[0];

    // 1. Check Supabase cache
    const cachedContent = await getCachedContent(userId, contentType, dateKey);
    if (cachedContent) {
        return cachedContent;
    }

    // 2. If not in cache, generate new content
    console.log(`Generating new content for ${contentType} on ${dateKey} as it was not found in cache.`);
    const generatedContent = await generateDynamicContent(contentType, dateKey);

    if (generatedContent) {
        // 3. Save to Supabase cache
        try {
            await saveCachedContent(userId, contentType, dateKey, generatedContent);
        } catch (e) {
            console.error("Error saving content to Supabase cache", e);
        }
    }
    return generatedContent;
}

export async function generateDynamicContent(contentType: 'analytics' | 'transportation-physics' | 'french-sound' | 'classic-rock-500' | 'exercise-plan', dateKey: string): Promise<any> {
    // If no API key, return fallback content
    // Proxy handles auth, so we always attempt to generate
    // if (!hasApiKey) {
    //    return getFallbackContent(contentType, dateKey);
    // }

    let prompt = '';
    let needsJson = false;

    if (contentType === 'analytics') {
        prompt = `Generate a unique, new set of daily technical topics for an analytics engineer for the date ${dateKey}. Provide one SQL question, one DAX question, one Snowflake question, one dbt question, one explanation of a DMBOK data management concept, and one topic on data quality. For the Data Quality topic, focus on a common column data type (e.g., String, Numeric, Datetime), list 3-4 potential data quality issues found in such columns, and describe common data transformations to correct them in a big data context. Each question must include a title, a prompt/problem description, and a concise solution. The DMBOK and Data Quality explanations must have a title and a detailed explanation. Ensure the content is different from other days.

Return the response as a JSON object with this exact structure:
{
  "sql": {"title": "...", "prompt": "...", "solution": "..."},
  "dax": {"title": "...", "prompt": "...", "solution": "..."},
  "snowflake": {"title": "...", "prompt": "...", "solution": "..."},
  "dbt": {"title": "...", "prompt": "...", "solution": "..."},
  "dataManagement": {"title": "...", "explanation": "..."},
  "dataQuality": {
    "title": "...",
    "dataType": "...",
    "issues": ["...", "..."],
    "transformations": ["...", "..."]
  }
}`;
        needsJson = true;
    } else if (contentType === 'transportation-physics') {
        prompt = `For the date ${dateKey}, explain a single, fundamental physics principle behind a common mode of transportation (like a car, bike, or plane). The goal is to explain the working principle to a layman at a very conceptual level. Use simple analogies and avoid technical jargon or formulas. The topic must be unique and different from other days. For example, you could explain how airplane wings generate lift conceptually, why tires need tread, or the basic idea behind regenerative braking. Provide a title and an explanation that is extremely easy to understand for someone with no physics background.

Return as JSON:
{
  "title": "...",
  "explanation": "..."
}`;
        needsJson = true;
    } else if (contentType === 'french-sound') {
        prompt = `Act as a French phonetics teacher planning a long-term course. For the date ${dateKey}, create a self-contained lesson for a single, unique French phoneme. The series of lessons over many days should eventually cover all phonemes of the French language in a logical progression. The content for this single day must be unique. Provide: 1. The target sound (e.g., 'an', 'in', 'ou' or an IPA symbol). 2. A list of exactly 10 example words that use this sound. For each word, provide the French word, a simple phonetic cue for an English speaker, and its English meaning. Do not use markdown.

Return as JSON:
{
  "sound": "...",
  "words": [
    {"word": "...", "cue": "...", "meaning": "..."},
    ...
  ]
}`;
        needsJson = true;
    } else if (contentType === 'classic-rock-500') {
        prompt = `Generate a JSON array of exactly 500 items. Each item must have two string fields: title and artist. The list should be classic rock (and closely related rock) songs that are well-known/popular for guitar learners. Keep it diverse across decades and artists; avoid duplicates. Return JSON only.

Format:
[
  {"title": "...", "artist": "..."},
  ...
]`;
        needsJson = true;
    } else if (contentType === 'exercise-plan') {
        const dayOfWeek = new Date(dateKey).getDay();
        const workoutType = getWorkoutType(dayOfWeek);

        prompt = `Generate a comprehensive ${workoutType.charAt(0).toUpperCase() + workoutType.slice(1)} workout plan for ${dateKey}. Create a 4-day weekly schedule with Push/Pull/Legs/Upper rotation. For the specific day, provide detailed exercises with proper form instructions, sets, reps, and rest periods. Focus on compound movements and progressive overload. Include muscle groups targeted and practical tips for each exercise.

Return as JSON:
{
  "push": {
    "exercises": [
      {"name": "...", "muscleGroup": "...", "sets": "...", "reps": "...", "rest": "...", "instructions": "...", "tips": "..."}
    ],
    "notes": "..."
  },
  "pull": {...},
  "legs": {...},
  "rest": {
    "activities": ["..."],
    "notes": "..."
  }
}`;
        needsJson = true;
    } else {
        return null;
    }

    try {
        const responseText = await callPerplexityAPI(prompt, {
            model: 'sonar-pro',
            responseFormat: needsJson ? 'json_object' : 'text'
        });

        if (needsJson) {
            // Try to extract JSON from response if it's wrapped in markdown or text
            let jsonText = responseText.trim();

            // Remove markdown code blocks if present
            jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

            try {
                return JSON.parse(jsonText);
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                console.error('Response text:', responseText);
                // Try to extract JSON object from text
                const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                throw parseError;
            }
        }

        return responseText;
    } catch (error) {
        const appError = ErrorHandler.handleApiError(error, `Content generation for ${contentType}`);
        ErrorHandler.logError(appError);
        // Don't show user error for background content generation
        return null;
    }
}

export async function getOrGeneratePlanForDate(userId: string, date: Date, dateKey: string): Promise<string> {
    // 1. Check Supabase cache
    const cachedPlan = await getCachedFoodPlan(userId, dateKey);
    if (cachedPlan) {
        return cachedPlan;
    }

    // 2. Generate new plan
    console.log(`Generating new food plan for ${dateKey} as it was not found in cache.`);
    const newPlan = await generateFoodPlanForDate(date);

    if (newPlan && !newPlan.startsWith("Could not generate")) {
        // 4. Save to Supabase cache
        try {
            await saveFoodPlan(userId, dateKey, newPlan);
        } catch (e) {
            console.error("Error saving food plan to Supabase cache", e);
        }
    }

    return newPlan;
}

export async function generateFoodPlanForDate(date: Date): Promise<string> {
    // If no API key, return fallback food plan
    // Proxy handles auth
    // if (!hasApiKey) {
    //     return getFallbackFoodPlan(date);
    // }

    const dayOfWeek = date.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    let prompt = `Create a full-day meal plan using only whole, minimally processed foods that naturally support libido. Format the output as a simple, scannable list with clear headings (Breakfast, Lunch, Dinner, Snack). Be very concise. Prioritize ingredients known to boost sexual health: oysters, leafy greens, avocados, nuts, dark chocolate, berries, watermelon, olive oil, eggs, fatty fish, ginger, cinnamon. Avoid processed foods, refined sugar, and alcohol. Do not use any markdown formatting like asterisks.`;

    // Day 2 (Tuesday) and 4 (Thursday) are no-meat days
    if (dayOfWeek === 2 || dayOfWeek === 4) {
        prompt += ' Avoid all meat (including poultry and red meat), but allow seafood, eggs, and plant-based protein.';
    }

    try {
        const responseText = await callPerplexityAPI(prompt, {
            model: 'sonar-pro',
            responseFormat: 'text'
        });
        const text = responseText.replace(/\*/g, '');
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
            upper: {
                exercises: [
                    {
                        name: "Incline Bench Press",
                        muscleGroup: "Upper Chest, Shoulders",
                        sets: "4",
                        reps: "8-10",
                        rest: "90s",
                        instructions: "Set bench to 30-45 degree incline, press weight to upper chest",
                        tips: "Focus on upper chest activation"
                    },
                    {
                        name: "Pull-ups",
                        muscleGroup: "Lats, Biceps",
                        sets: "4",
                        reps: "6-10",
                        rest: "90s",
                        instructions: "Hang from bar, pull body up until chin over bar",
                        tips: "Use full range of motion"
                    },
                    {
                        name: "Dumbbell Shoulder Press",
                        muscleGroup: "Shoulders, Triceps",
                        sets: "3",
                        reps: "8-12",
                        rest: "60s",
                        instructions: "Press dumbbells overhead, lower to shoulder level",
                        tips: "Keep core tight"
                    },
                    {
                        name: "Barbell Rows",
                        muscleGroup: "Lats, Rhomboids, Biceps",
                        sets: "3",
                        reps: "8-12",
                        rest: "60s",
                        instructions: "Hinge at hips, row bar to lower chest",
                        tips: "Squeeze shoulder blades together"
                    }
                ],
                notes: "Full upper body workout combining push and pull movements"
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

// Weekly exercise content generation
export async function generateWeeklyExerciseContent(userId: string, startDate: Date): Promise<any> {
    const dateKey = startDate.toISOString().split('T')[0];

    // 1. Check Supabase cache
    const cachedContent = await getCachedContent(userId, 'weekly-exercise', dateKey);
    if (cachedContent) {
        return cachedContent;
    }

    // 2. Generate new weekly content
    console.log(`Generating new weekly exercise content starting from ${dateKey}`);
    const generatedContent = await generateWeeklyContent(startDate);

    if (generatedContent) {
        // 3. Save to Supabase cache
        try {
            await saveCachedContent(userId, 'weekly-exercise', dateKey, generatedContent);
        } catch (e) {
            console.error("Error saving weekly content to Supabase cache", e);
        }
    }
    return generatedContent;
}

async function generateWeeklyContent(startDate: Date): Promise<any> {
    // If no API key, return fallback weekly content
    // Proxy handles auth
    // if (!hasApiKey) {
    //     return getFallbackWeeklyContent(startDate);
    // }

    const prompt = `Generate a comprehensive 7-day workout plan starting from ${startDate.toISOString().split('T')[0]}. 
    
    The schedule should be:
    - Sunday: Rest day
    - Monday: Push day (chest, shoulders, triceps)
    - Tuesday: Rest day  
    - Wednesday: Pull day (back, biceps, rear delts)
    - Thursday: Rest day
    - Friday: Legs day (quads, hamstrings, glutes, calves)
    - Saturday: Upper body day (combination of push and pull)

    For each workout day, provide 3-4 exercises with:
    - Exercise name
    - Target muscle groups
    - Sets and reps
    - Rest periods
    - Brief form instructions
    - Pro tips

    For rest days, suggest active recovery activities.

    Focus on compound movements, progressive overload, and proper form. Make each day unique and challenging.

    Return as JSON with this structure:
    {
      "sunday": {"type": "rest", "activities": ["..."], "notes": "..."},
      "monday": {"type": "push", "exercises": [{"name": "...", "muscleGroups": "...", "sets": "...", "reps": "...", "rest": "...", "instructions": "...", "tips": "..."}], "notes": "..."},
      ...
    }`;

    try {
        const responseText = await callPerplexityAPI(prompt, {
            model: 'sonar-pro',
            responseFormat: 'json_object'
        });

        // Try to parse JSON
        let jsonText = responseText.trim();
        jsonText = jsonText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

        try {
            return JSON.parse(jsonText);
        } catch (parseError) {
            const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw parseError;
        }
    } catch (error) {
        const appError = ErrorHandler.handleApiError(error, 'Weekly exercise content generation');
        ErrorHandler.logError(appError);
        return getFallbackWeeklyContent(startDate);
    }
}

function getFallbackWeeklyContent(startDate: Date): any {
    return {
        sunday: {
            type: "rest",
            activities: [
                "Light stretching or yoga",
                "Walking or light cardio",
                "Foam rolling",
                "Meditation or relaxation"
            ],
            notes: "Active recovery helps with muscle repair and reduces soreness"
        },
        monday: {
            type: "push",
            exercises: [
                {
                    name: "Bench Press",
                    muscleGroups: "Chest, Shoulders, Triceps",
                    sets: "4",
                    reps: "8-10",
                    rest: "90s",
                    instructions: "Lie on bench, grip bar slightly wider than shoulders, lower to chest, press up explosively",
                    tips: "Keep core tight, maintain neutral spine"
                },
                {
                    name: "Overhead Press",
                    muscleGroups: "Shoulders, Triceps",
                    sets: "3",
                    reps: "8-12",
                    rest: "60s",
                    instructions: "Stand with feet hip-width, press weight overhead, lower to shoulders",
                    tips: "Engage core, avoid arching back"
                },
                {
                    name: "Dips",
                    muscleGroups: "Chest, Triceps",
                    sets: "3",
                    reps: "8-15",
                    rest: "60s",
                    instructions: "Support body on bars, lower until shoulders below elbows, press up",
                    tips: "Lean slightly forward for chest emphasis"
                }
            ],
            notes: "Focus on compound movements for maximum muscle activation"
        },
        tuesday: {
            type: "rest",
            activities: [
                "Light stretching or yoga",
                "Walking or light cardio",
                "Foam rolling",
                "Meditation or relaxation"
            ],
            notes: "Active recovery helps with muscle repair and reduces soreness"
        },
        wednesday: {
            type: "pull",
            exercises: [
                {
                    name: "Pull-ups",
                    muscleGroups: "Lats, Biceps, Rear Delts",
                    sets: "4",
                    reps: "5-10",
                    rest: "90s",
                    instructions: "Hang from bar, pull body up until chin over bar, lower with control",
                    tips: "Use full range of motion, engage lats"
                },
                {
                    name: "Bent-over Rows",
                    muscleGroups: "Lats, Rhomboids, Biceps",
                    sets: "3",
                    reps: "8-12",
                    rest: "60s",
                    instructions: "Hinge at hips, row weight to lower chest, squeeze shoulder blades",
                    tips: "Keep back straight, core engaged"
                },
                {
                    name: "Face Pulls",
                    muscleGroups: "Rear Delts, Rhomboids",
                    sets: "3",
                    reps: "12-15",
                    rest: "45s",
                    instructions: "Pull cable to face, separate hands at face level",
                    tips: "Focus on external rotation"
                }
            ],
            notes: "Emphasize pulling movements to balance pushing exercises"
        },
        thursday: {
            type: "rest",
            activities: [
                "Light stretching or yoga",
                "Walking or light cardio",
                "Foam rolling",
                "Meditation or relaxation"
            ],
            notes: "Active recovery helps with muscle repair and reduces soreness"
        },
        friday: {
            type: "legs",
            exercises: [
                {
                    name: "Squats",
                    muscleGroups: "Quads, Glutes, Hamstrings",
                    sets: "4",
                    reps: "8-12",
                    rest: "90s",
                    instructions: "Stand with feet shoulder-width, lower until thighs parallel, drive up through heels",
                    tips: "Keep chest up, knees tracking over toes"
                },
                {
                    name: "Romanian Deadlifts",
                    muscleGroups: "Hamstrings, Glutes",
                    sets: "3",
                    reps: "8-10",
                    rest: "90s",
                    instructions: "Hinge at hips, lower weight along legs, feel stretch in hamstrings",
                    tips: "Keep back straight, slight knee bend"
                },
                {
                    name: "Walking Lunges",
                    muscleGroups: "Quads, Glutes, Hamstrings",
                    sets: "3",
                    reps: "10 each leg",
                    rest: "60s",
                    instructions: "Step forward into lunge, push back to standing, alternate legs",
                    tips: "Keep torso upright, control the movement"
                }
            ],
            notes: "Focus on proper form and full range of motion"
        },
        saturday: {
            type: "upper",
            exercises: [
                {
                    name: "Incline Bench Press",
                    muscleGroups: "Upper Chest, Shoulders",
                    sets: "4",
                    reps: "8-10",
                    rest: "90s",
                    instructions: "Set bench to 30-45 degree incline, press weight to upper chest",
                    tips: "Focus on upper chest activation"
                },
                {
                    name: "Pull-ups",
                    muscleGroups: "Lats, Biceps",
                    sets: "4",
                    reps: "6-10",
                    rest: "90s",
                    instructions: "Hang from bar, pull body up until chin over bar",
                    tips: "Use full range of motion"
                },
                {
                    name: "Dumbbell Shoulder Press",
                    muscleGroups: "Shoulders, Triceps",
                    sets: "3",
                    reps: "8-12",
                    rest: "60s",
                    instructions: "Press dumbbells overhead, lower to shoulder level",
                    tips: "Keep core tight"
                },
                {
                    name: "Barbell Rows",
                    muscleGroups: "Lats, Rhomboids, Biceps",
                    sets: "3",
                    reps: "8-12",
                    rest: "60s",
                    instructions: "Hinge at hips, row bar to lower chest",
                    tips: "Squeeze shoulder blades together"
                }
            ],
            notes: "Full upper body workout combining push and pull movements"
        }
    };
}

