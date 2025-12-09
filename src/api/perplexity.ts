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

    // 1. Check Supabase cache (skip for french-sound to ensure randomness)
    if (contentType !== 'french-sound') {
        const cachedContent = await getCachedContent(userId, contentType, dateKey);
        if (cachedContent) {
            return cachedContent;
        }
    }

    // 2. If not in cache (or if random), generate new content
    console.log(`Generating new content for ${contentType} on ${dateKey}...`);
    const generatedContent = await generateDynamicContent(contentType, dateKey);

    if (generatedContent) {
        // 3. Save to Supabase cache (skip for french-sound as it is random/ephemeral)
        if (contentType !== 'french-sound') {
            try {
                await saveCachedContent(userId, contentType, dateKey, generatedContent);
            } catch (e) {
                console.error("Error saving content to Supabase cache", e);
            }
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
        prompt = `Generate analytics engineer daily quiz for ${dateKey}. Techs: SQL, DAX, Snowflake, dbt, DMBOK concept, Data Quality (focus: specific data type issues/fixes). Unique daily topics. JSON format required.`;


        needsJson = true;
    } else if (contentType === 'transportation-physics') {
        prompt = `Explain one transportation physics principle(e.g.lift, braking) for ${dateKey}.Layman terms, simple analogy.Unique daily topic.JSON output.`;


        needsJson = true;
    } else if (contentType === 'french-sound') {
        prompt = `Generate a random, useful French office phrase. Something different from previous requests. Context: Business setting. JSON: {phrase, pronunciation, translation, context}.`;
        needsJson = true;
    } else if (contentType === 'classic-rock-500') {
        prompt = `JSON array of 500 unique classic rock songs(title, artist).Focus: guitar friendly.No duplicates.`;


        needsJson = true;
    } else if (contentType === 'exercise-plan') {
        const dayOfWeek = new Date(dateKey).getDay();
        const workoutType = getWorkoutType(dayOfWeek);

        prompt = `Generate ${workoutType} workout plan for ${dateKey}. 4-day split (Push/Pull/Legs/Upper). Detail exercises with sets/reps/tips. Focus on compound movements. JSON format.`;


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
    let prompt = `Full-day libido-boosting whole food meal plan. Clear headers (Breakfast, Lunch, Dinner, Snack). Ingredients: oysters, greens, avo, nuts, dark choc, berries, eggs, fish, ginger. No processed/sugar/alcohol. Concise list. No markdown.`;

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
            phrase: "Je voudrais planifier une réunion",
            pronunciation: "Zhuh voo-dray plah-nee-fjay oon ray-oon-yon",
            translation: "I would like to schedule a meeting",
            context: "Used when asking a colleague to set up a time to talk."
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
    Dinner: Lean beef stir - fry with vegetables
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
    console.log(`Generating new weekly exercise content starting from ${dateKey} `);
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

    const prompt = `7 - day workout plan(Push / Pull / Legs / Upper / Rest) starting ${startDate.toISOString().split('T')[0]}. Exercises with sets / reps / tips.JSON format.`;

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

