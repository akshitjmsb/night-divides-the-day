import { GoogleGenAI, Chat, GenerateContentResponse, Type } from "@google/genai";

// Debug API key
console.log('API Key available:', !!process.env.API_KEY);
console.log('API Key length:', process.env.API_KEY ? process.env.API_KEY.length : 0);

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

// A placeholder for a simple, anonymous key-value store service URL.
// This allows data to be shared across devices, fulfilling the user's request
// for content to be generated once and then viewable everywhere.
// Switched to a more reliable service to fix "Failed to fetch" errors.
const CLOUD_CACHE_BASE_URL = 'https://kvdb.io/akki-boy-dashboard-cache';


document.addEventListener('DOMContentLoaded', () => {
    /**
     * A simple utility to escape HTML characters and prevent XSS.
     * @param unsafe The string to escape.
     * @returns The escaped string.
     */
    function escapeHtml(unsafe: string): string {
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    /**
     * Gets the current date and hour based on a canonical timezone ('America/Los_Angeles')
     * to ensure the app's state is consistent for all users, regardless of their location.
     * @returns An object with the canonical Date object and the hour (0-23).
     */
    function getCanonicalTime(): { now: Date, hour: number } {
        const canonicalTimeZone = 'America/Los_Angeles';
        
        const formatter = new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hourCycle: 'h23', // Ensures hour is 00-23, avoiding potential '24'
            timeZone: canonicalTimeZone,
        });
        
        const parts = formatter.formatToParts(new Date());
        const partMap: { [key: string]: string } = {};
        for (const part of parts) {
            if (part.type !== 'literal') {
                partMap[part.type] = part.value;
            }
        }

        const year = parseInt(partMap.year);
        const month = parseInt(partMap.month); // 1-12
        const day = parseInt(partMap.day);
        const hour = parseInt(partMap.hour);
        const minute = parseInt(partMap.minute);
        const second = parseInt(partMap.second);

        // This creates a new Date object using the browser's local timezone, but seeding
        // it with the wall-clock values from our canonical timezone. This makes all
        // subsequent date logic work consistently for every user.
        const canonicalNow = new Date(year, month - 1, day, hour, minute, second);

        return { now: canonicalNow, hour: hour };
    }

    // --- DATA ---
    const lifePointers = [
        "Just be there like a tree", "30 minute work quantums", "Director or Actor ?", "Try first", "Don't take your mind seriously", "It's not about me!", "Never steal the thunder", "Night divides the day", "Only person that can help you is YOU", "All IN", "It is happening now", "Enjoy imperfections", "Be a role model not a teacher", "Listen to your body", "Transform your company (Take actions 5 years ahead)", "Wait and Absorb - Everything is human mind made!", "No substitute to hardwork", "Sleep over it", "Dance in the Dance of Strangers", "Beyond thoughts - You are more than your thoughts", "Respond to change vs Following a plan", "Energy optimization instead of Time optimization", "Break - fast, Break it well!", "Slowly is the only fastest way to success", "Only Dare required is Dare to try", "SPEAK UP - ASK!", "Be courageous to listen to the voice in your head", "Rather than love, than money, than faith, than fame, than fairness, give me truth!!"
    ];
    
    /**
     * Checks if content for a future date (preview) is ready to be generated or viewed.
     * Content is considered ready after 5 PM (17:00) on the day before the content's date.
     * @param {Date} previewDate The date of the content to be previewed.
     * @returns {boolean} True if the content is ready.
     */
    function isContentReadyForPreview(previewDate: Date): boolean {
        const { now } = getCanonicalTime(); // Use canonical "now" for comparison
        const generationUnlockTime = new Date(previewDate);
        generationUnlockTime.setDate(previewDate.getDate() - 1); // Day before
        generationUnlockTime.setHours(17, 0, 0, 0); // At 5 PM

        return now.getTime() >= generationUnlockTime.getTime();
    }

    // --- STATE & DERIVED DATA ---
    let todayKey: string, tomorrowKey: string, tomorrowDay: number, archiveKey: string;
    let activeContentDate: Date, previewContentDate: Date, archiveDate: Date;
    let todaysLifePointer: any;
    let quantumTimerId: number | null = null;
    let quantumSecondsLeft = 30 * 60;
    let isQuantumActive = false;
    let quantumTimerBtn: HTMLElement | null;
    let quantumTimerDisplay: HTMLElement | null;
    let isAutoGenerating = false;
    let lastApiCall = 0;
    const API_RATE_LIMIT = 1000; // 1 second between calls

    const getDayOfYear = (date: Date) => {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    };

    function updateDateDerivedData() {
        const { now, hour } = getCanonicalTime();

        // Determine the active content date based on the time.
        // From midnight to 7:59 AM, the "active day" is still considered the previous calendar day.
        if (hour < 8) {
            activeContentDate = new Date(now);
            activeContentDate.setDate(now.getDate() - 1);
        } else {
            activeContentDate = new Date(now);
        }

        // The preview date is always the day after the active content date.
        previewContentDate = new Date(activeContentDate);
        previewContentDate.setDate(activeContentDate.getDate() + 1);

        // The archive date is always the day before the active content date.
        archiveDate = new Date(activeContentDate);
        archiveDate.setDate(activeContentDate.getDate() - 1);

        // Derive keys and other data from these canonical dates.
        todayKey = activeContentDate.toISOString().split('T')[0];
        tomorrowKey = previewContentDate.toISOString().split('T')[0];
        archiveKey = archiveDate.toISOString().split('T')[0];
        tomorrowDay = previewContentDate.getDay();
        
        const dayOfYear = getDayOfYear(activeContentDate);
        todaysLifePointer = lifePointers[(dayOfYear - 1) % lifePointers.length];
    }
    
    let tasks: { text: string; completed: boolean }[] = [];

    // Active chat state for the modal UI
    let chatHistory: { role: 'user' | 'model'; text: string }[] = [];
    let chat: Chat; // This will hold the currently active chat instance (main or contextual)

    // Persistent state for the main chat feature
    let mainChatHistory: { role: 'user' | 'model'; text: string }[] = [];
    let mainChat: Chat; // This holds the main, persistent chat instance


    // --- DATA PERSISTENCE ---
    async function loadTasks() {
        const cloudKey = 'persistent-tasks-list';
    
        // 1. Try to fetch from cloud first to sync across devices
        try {
            const response = await fetch(`${CLOUD_CACHE_BASE_URL}/${cloudKey}`);
            if (response.ok) {
                const responseText = await response.text();
                if (responseText) {
                    try {
                        const cloudData = JSON.parse(responseText);
                        if (cloudData && Array.isArray(cloudData.tasks)) {
                            console.log("Successfully loaded tasks from cloud cache.");
                            tasks = cloudData.tasks.filter((t: any) => 
                                typeof t === 'object' && t !== null && 'text' in t && 'completed' in t
                            );
                            localStorage.setItem('persistentTasks', JSON.stringify(tasks)); // Sync back to local
                            return;
                        }
                    } catch (jsonError) {
                         console.warn("Failed to parse tasks from cloud cache. It was not valid JSON.", jsonError);
                    }
                }
            }
        } catch (e) {
            console.warn("Could not fetch tasks from cloud. Falling back to local storage.", e);
        }
    
        // 2. Fallback to local storage if cloud fails or is empty
        console.log("Loading tasks from local storage.");
        const storedTasksRaw = localStorage.getItem('persistentTasks');
        if (!storedTasksRaw) {
            tasks = [];
            return;
        }
        try {
            const parsedTasks = JSON.parse(storedTasksRaw);
            if (Array.isArray(parsedTasks)) {
                tasks = parsedTasks.filter(t => typeof t === 'object' && t !== null && 'text' in t && 'completed' in t);
            } else {
                tasks = [];
            }
        } catch (error) {
            console.error("Error parsing tasks from localStorage.", error);
            tasks = [];
        }
    }

    async function saveTasks() {
        // 1. Save to local storage immediately for speed and offline access
        localStorage.setItem('persistentTasks', JSON.stringify(tasks));
    
        // 2. Asynchronously save to cloud to sync across devices
        const cloudKey = 'persistent-tasks-list';
        try {
            // Use a specific key for the tasks list that is not date-dependent.
            const response = await fetch(`${CLOUD_CACHE_BASE_URL}/${cloudKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Wrap the tasks array in an object for consistency with other cached items.
                body: JSON.stringify({ tasks: tasks }),
            });
            if (!response.ok) {
                 // Log an error if the cloud save fails but don't throw, as local save succeeded.
                 console.error(`Failed to save tasks to cloud. Status: ${response.status}`);
            } else {
                console.log("Tasks saved to cloud cache.");
            }
        } catch (e) {
            console.error("Error saving tasks to cloud cache. They are still saved locally.", e);
        }
    }

    async function loadChatHistory() {
        const cloudKey = 'persistent-main-chat-history';

        // 1. Try cloud first to sync across devices
        try {
            const response = await fetch(`${CLOUD_CACHE_BASE_URL}/${cloudKey}`);
            if (response.ok) {
                const responseText = await response.text();
                if (responseText) {
                    const cloudData = JSON.parse(responseText);
                    if (cloudData && Array.isArray(cloudData.history)) {
                        console.log("Successfully loaded chat history from cloud cache.");
                        mainChatHistory = cloudData.history;
                        localStorage.setItem('persistentChatHistory', JSON.stringify(mainChatHistory));
                        return;
                    }
                }
            }
        } catch (e) {
            console.warn("Could not fetch chat history from cloud. Falling back to local storage.", e);
        }

        // 2. Fallback to local storage
        console.log("Loading chat history from local storage.");
        const storedHistory = localStorage.getItem('persistentChatHistory');
        if (storedHistory) {
            try {
                const parsedHistory = JSON.parse(storedHistory);
                if (Array.isArray(parsedHistory)) {
                    mainChatHistory = parsedHistory;
                }
            } catch (error) {
                console.error("Error parsing chat history from localStorage.", error);
                mainChatHistory = [];
            }
        } else {
            mainChatHistory = [];
        }
    }

    async function saveChatHistory() {
        // We only save the main chat history to local and cloud storage.
        localStorage.setItem('persistentChatHistory', JSON.stringify(mainChatHistory));

        const cloudKey = 'persistent-main-chat-history';
        try {
            await fetch(`${CLOUD_CACHE_BASE_URL}/${cloudKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: mainChatHistory }),
            });
            console.log("Chat history saved to cloud cache.");
        } catch (e) {
            console.error("Error saving chat history to cloud cache. It is still saved locally.", e);
        }
    }

    // --- DYNAMIC CONTENT GENERATION & CACHING ---
    async function getOrGenerateDynamicContent(contentType: 'analytics' | 'transportation-physics' | 'french-sound', date: Date): Promise<any> {
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
    
    async function generateDynamicContent(contentType: 'analytics' | 'transportation-physics' | 'french-sound', dateKey: string): Promise<any> {
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
    
    /**
     * Displays a status message to the user, typically for content synchronization.
     * @param {string} message The message to display.
     * @param {boolean} isFinal If true, the message will disappear after a short delay.
     */
    function showSyncStatus(message: string, isFinal: boolean = false) {
        const statusEl = document.getElementById('sync-status');
        if (statusEl) {
            statusEl.innerHTML = message;
            statusEl.classList.remove('hidden');
            if (isFinal) {
                setTimeout(() => {
                    statusEl.classList.add('hidden');
                }, 2500); // Hide after 2.5 seconds
            }
        }
    }

    /**
     * Proactively generates the next day's content after 5 PM.
     * This function is triggered on app load and periodically to "warm the cache",
     * creating the experience of an autonomous sync process for the user.
     */
    async function triggerAutoContentGeneration() {
        if (isAutoGenerating) {
            return; // Generation is already in progress.
        }

        updateDateDerivedData(); 
        
        const dateForGeneration = previewContentDate;
        const dateKeyForGeneration = dateForGeneration.toISOString().split('T')[0];

        // Check if we are in the window to generate tomorrow's content (i.e., it's after 5 PM today).
        if (!isContentReadyForPreview(dateForGeneration)) {
            return; // Not time to generate yet.
        }

        // This key prevents re-triggering the generation process every 5 minutes after 5 PM.
        const generationAttemptedKey = `auto-generation-attempted-${dateKeyForGeneration}`;
        if (localStorage.getItem(generationAttemptedKey)) {
            return; // We've already run auto-generation for this date.
        }

        isAutoGenerating = true;
        showSyncStatus('⚙️ Synchronizing next day\'s content...');
        console.log(`It's after 5 PM. Triggering background content generation for ${dateKeyForGeneration}...`);
        
        try {
            // We "warm the cache" by calling the generation functions.
            // They will check existing caches first and only generate/fetch if the content is missing.
            const promises = [
                getOrGeneratePlanForDate(dateForGeneration, tomorrowKey),
                getOrGenerateDynamicContent('french-sound', dateForGeneration),
                getOrGenerateDynamicContent('analytics', dateForGeneration),
                getOrGenerateDynamicContent('transportation-physics', dateForGeneration)
            ];

            await Promise.all(promises);
            
            console.log(`Background content generation for ${dateKeyForGeneration} complete.`);
            
            // Mark that we've successfully attempted generation for this date.
            localStorage.setItem(generationAttemptedKey, new Date().toISOString());
            showSyncStatus('✅ Sync complete. Tomorrow\'s preview is ready.', true);

        } catch (error) {
            console.error("An error occurred during background content generation:", error);
            showSyncStatus('⚠️ Error synchronizing content. Will try again later.', true);
        } finally {
            isAutoGenerating = false;
        }
    }


    // --- FOOD PLAN & CORE DATA LOGIC ---
    async function getOrGeneratePlanForDate(date: Date, dateKey: string): Promise<string> {
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
    
        // 2. Check cloud cache
        try {
            const response = await fetch(`${CLOUD_CACHE_BASE_URL}/${cloudKey}`);
            if (response.ok) {
                const responseText = await response.text();
                if (responseText) {
                    try {
                        const cloudData = JSON.parse(responseText);
                        if (cloudData && cloudData.plan) {
                            localStorage.setItem(localKey, cloudData.plan);
                            return cloudData.plan;
                        }
                    } catch (jsonError) {
                         console.warn('Failed to parse food plan from cloud.', jsonError);
                    }
                }
            }
        } catch (e) {
            console.warn("Could not fetch food plan from cloud cache. Will generate.", e);
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


    async function loadCoreData() {
        // All dynamic content (food plans, French lessons) is now loaded on-demand
        // when the user clicks to open a modal. This avoids caching content on one
        // device that isn't available on another.
    }

    async function generateFoodPlanForDate(date: Date): Promise<string> {
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
    
    // --- QUANTUM TIMER LOGIC ---
    function updateQuantumTimerDisplay() {
        if (!quantumTimerDisplay) return;
        const minutes = Math.floor(quantumSecondsLeft / 60);
        const seconds = quantumSecondsLeft % 60;
        quantumTimerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function stopQuantumTimer(reset: boolean = true) {
        if (quantumTimerId) clearInterval(quantumTimerId);
        quantumTimerId = null;
        isQuantumActive = false;
        if (quantumTimerBtn) quantumTimerBtn.textContent = 'Start Quantum';
        if (reset) {
            quantumSecondsLeft = 30 * 60;
        }
        updateQuantumTimerDisplay();
    }

    function startQuantumTimer() {
        if (isQuantumActive || !quantumTimerBtn) return;
        
        isQuantumActive = true;
        quantumTimerBtn.textContent = 'Stop Quantum';

        quantumTimerId = window.setInterval(() => {
            quantumSecondsLeft--;
            updateQuantumTimerDisplay();

            if (quantumSecondsLeft <= 0) {
                clearInterval(quantumTimerId as number);
                quantumTimerId = null;
                
                if (quantumTimerDisplay) {
                    quantumTimerDisplay.textContent = "Break!";
                    quantumTimerDisplay.classList.add('text-red-500', 'animate-pulse');
                }
                if (quantumTimerBtn) quantumTimerBtn.style.display = 'none';

                try {
                    const synth = window.speechSynthesis;
                    if (synth.speaking) {
                        synth.cancel();
                    }
                    const utterance = new SpeechSynthesisUtterance("Break time Akki boyyyyy");
                    utterance.lang = 'en-US';
                    synth.speak(utterance);
                } catch (e) {
                    console.error("Could not play text-to-speech audio.", e);
                }

                setTimeout(() => {
                    if (quantumTimerDisplay) {
                        quantumTimerDisplay.classList.remove('text-red-500', 'animate-pulse');
                    }
                    if (quantumTimerBtn) quantumTimerBtn.style.display = 'inline-block';
                    stopQuantumTimer(true); // Fully reset
                }, 10000); // 10s break message
            }
        }, 1000);
    }
    
    // --- WORLD ORDER & TENNIS LOGIC ---
    async function fetchAndShowWorldOrder() {
        const modal = document.getElementById('geopolitics-modal');
        const headlinesContent = document.getElementById('geopolitics-headlines-content');

        if (!modal || !headlinesContent) return;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        headlinesContent.innerHTML = '<p>Searching the web for the latest headlines...</p>';
        
        try {
            const prompt = "Be extremely brief. First, what is the single most important, recent headline about Donald Trump? State it in 10 words or less. Then, list the 5 most critical world order headlines (US/Canada focused) as ultra-short, scannable bullet points. Finally, list the 5 latest major headlines from India in the same brief format. Do not use asterisks or any markdown formatting.";
            
            const response = await ai.models.generateContent({
               model: "gemini-2.5-flash",
               contents: prompt,
               config: {
                 tools: [{googleSearch: {}}],
               },
            });

            let html = '';
            
            // Display the main text response from the model
            if(response.text) {
                // The response is plain text, so we can format it a bit.
                // Replace newlines with <br> and bold any text that looks like a heading (e.g., text ending with a colon).
                const formattedText = response.text
                    .replace(/\*/g, '')
                    .replace(/\n/g, '<br>')
                    .replace(/^(.*?):<br>/gm, '<strong class="block mt-3 mb-1">$1:</strong>');
                html += `<div class="mb-4">${formattedText}</div>`;
            } else {
                 html += `<p>Could not retrieve any news data at this time.</p>`;
            }

            // Display the grounding sources
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks && groundingChunks.length > 0) {
                html += '<hr class="my-4 border-gray-300">';
                html += '<h4 class="text-md font-bold mb-2">Sources:</h4>';
                html += '<ul class="list-disc pl-5 text-sm space-y-1">';
                // Filter out potential duplicates by URI
                const uniqueSources = Array.from(new Map(groundingChunks.map(chunk => [chunk.web?.uri, chunk])).values());

                uniqueSources.forEach(chunk => {
                    if (chunk.web && chunk.web.uri) {
                        html += `<li><a href="${chunk.web.uri}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${chunk.web.title || chunk.web.uri}</a></li>`;
                    }
                });
                html += '</ul>';
            }

            headlinesContent.innerHTML = html;

        } catch (error) {
            console.error("Error fetching World Order headlines:", error);
            headlinesContent.innerHTML = `<p>An API Error occurred. Could not fetch headlines at this time.</p>`;
        }
    }

    async function fetchAndShowTennisMatches() {
        const modal = document.getElementById('tennis-modal');
        const contentEl = document.getElementById('tennis-content');
        if (!modal || !contentEl) return;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        contentEl.innerHTML = '<p>Searching the web for latest match information...</p>';

        try {
            const prompt = `Using Google Search, provide a concise, scannable list of recent results and key upcoming professional tennis matches involving any Top 10 ATP or WTA player. For each match, mention the tournament name. Format it like 'Tournament Name - Result: [Player A] d. [Player B] [Score]' or 'Tournament Name - Upcoming: [Player C] vs [Player D]'. Be very brief and avoid redundancy. Do not use asterisks or any markdown formatting.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{googleSearch: {}}],
                }
            });

            let html = '';

            // Display the main text response from the model
            if (response.text) {
                // The response is plain text, so we can format it a bit.
                // Replace newlines with <br> and bold any text that looks like a heading (e.g., text ending with a colon).
                const formattedText = response.text
                    .replace(/\*/g, '')
                    .replace(/\n/g, '<br>')
                    .replace(/^(.*?):<br>/gm, '<strong class="block mt-3 mb-1">$1:</strong>');
                html += `<div class="mb-4">${formattedText}</div>`;
            } else {
                html += `<p>Could not retrieve any tennis data at this time.</p>`;
            }

            // Display the grounding sources
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks && groundingChunks.length > 0) {
                html += '<hr class="my-4 border-gray-300">';
                html += '<h4 class="text-md font-bold mb-2">Sources:</h4>';
                html += '<ul class="list-disc pl-5 text-sm space-y-1">';
                const uniqueSources = Array.from(new Map(groundingChunks.map(chunk => [chunk.web?.uri, chunk])).values());

                uniqueSources.forEach(chunk => {
                    if (chunk.web && chunk.web.uri) {
                        html += `<li><a href="${chunk.web.uri}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${chunk.web.title || chunk.web.uri}</a></li>`;
                    }
                });
                html += '</ul>';
            }

            contentEl.innerHTML = html;

        } catch (error) {
            console.error("Error fetching Tennis data:", error);
            contentEl.innerHTML = '<p>An API Error occurred. Could not fetch tennis information at this time.</p>';
        }
    }

    async function fetchAndShowCoffeeTip() {
        const modal = document.getElementById('coffee-modal');
        const contentEl = document.getElementById('coffee-content');
        if (!modal || !contentEl) return;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        contentEl.innerHTML = '<p>Loading today\'s coffee lesson...</p>';

        let coffeeData;
        try {
            // Use a unique prompt for each day to get a different lesson
            const dayOfYear = getDayOfYear(activeContentDate);
            const prompt = `For day ${dayOfYear} of the year, generate a unique, self-contained mini-lesson for someone aspiring to open their own coffee cafe. The lesson should cover a practical aspect of the coffee industry, market, or business operations. Provide a clear title, a detailed but accessible explanation, and a single key takeaway for a future cafe owner. Do not use asterisks or markdown.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { 
                                type: Type.STRING, 
                                description: 'The title of the coffee industry lesson.' 
                            },
                            explanation: {
                                type: Type.STRING,
                                description: 'A detailed explanation of the topic.'
                            },
                            takeaway: {
                                type: Type.STRING,
                                description: 'A single, actionable takeaway for a future cafe owner.'
                            }
                        },
                        required: ["title", "explanation", "takeaway"]
                    }
                }
            });

            try {
                coffeeData = JSON.parse(response.text);
            } catch (jsonError) {
                 console.error("Failed to parse JSON from Gemini response for coffee lesson:", jsonError);
                 contentEl.innerHTML = `<p>Could not parse the lesson. Please try again later.</p>`;
                 return;
            }

        } catch (error) {
            console.error("Error fetching Coffee Lesson:", error);
            contentEl.innerHTML = '<p>Could not retrieve a coffee lesson at this time.</p>';
            return;
        }
        
        if (coffeeData && coffeeData.title && coffeeData.explanation && coffeeData.takeaway) {
             contentEl.innerHTML = `
                <h4 class="font-bold text-md mb-2">${coffeeData.title.replace(/\*/g, '')}</h4>
                <p class="text-base mb-4">${coffeeData.explanation.replace(/\*/g, '')}</p>
                <div class="mt-4 pt-4 border-t border-gray-200">
                    <p class="text-sm font-bold">Key Takeaway:</p>
                    <p class="text-sm italic">${coffeeData.takeaway.replace(/\*/g, '')}</p>
                </div>
            `;
        } else {
             contentEl.innerHTML = '<p>Could not retrieve a coffee lesson. The response was empty.</p>';
        }
    }

    async function fetchAndShowGuitarTab() {
        const modal = document.getElementById('guitar-modal');
        const contentEl = document.getElementById('guitar-content');
        if (!modal || !contentEl) return;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        contentEl.innerHTML = '<p>Loading today\'s guitar lesson...</p>';

        let guitarData;
        try {
            // Use a unique prompt for each day to get a different lesson
            const dayOfYear = getDayOfYear(activeContentDate);
            const prompt = `For day ${dayOfYear} of the year, generate a unique, self-contained guitar lesson for someone learning to play guitar. Include:
1. A song title and artist (choose a popular, beginner-friendly song)
2. A simple guitar tab in ASCII format (use - for strings, numbers for frets, keep it simple)
3. A brief lesson explaining the technique or chord progression
4. A practice tip for beginners

Format the response as JSON with these exact fields:
{
    "title": "Song Name - Artist",
    "tab": "E|---0---0---0---0---\\nB|---1---1---1---1---\\nG|---0---0---0---0---\\nD|---2---2---2---2---\\nA|---3---3---3---3---\\nE|---x---x---x---x---",
    "lesson": "This lesson focuses on basic strumming pattern...",
    "tip": "Practice slowly and focus on clean chord transitions"
}`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            title: { 
                                type: Type.STRING, 
                                description: 'The song title and artist.' 
                            },
                            tab: {
                                type: Type.STRING,
                                description: 'The guitar tab in ASCII format.'
                            },
                            lesson: {
                                type: Type.STRING,
                                description: 'A brief lesson explaining the technique.'
                            },
                            tip: {
                                type: Type.STRING,
                                description: 'A practice tip for beginners.'
                            }
                        },
                        required: ["title", "tab", "lesson", "tip"]
                    }
                }
            });

            try {
                guitarData = JSON.parse(response.text);
            } catch (jsonError) {
                 console.error("Failed to parse JSON from Gemini response for guitar lesson:", jsonError);
                 contentEl.innerHTML = `<p>Could not parse the lesson. Please try again later.</p>`;
                 return;
            }

        } catch (error) {
            console.error("Error fetching Guitar Lesson:", error);
            contentEl.innerHTML = '<p>Could not retrieve a guitar lesson at this time.</p>';
            return;
        }
        
        if (guitarData && guitarData.title && guitarData.tab && guitarData.lesson && guitarData.tip) {
             contentEl.innerHTML = `
                <div class="space-y-4">
                    <h4 class="font-bold text-md mb-2">${guitarData.title.replace(/\*/g, '')}</h4>
                    <div class="bg-gray-100 p-3 rounded font-mono text-sm overflow-x-auto">
                        <pre>${guitarData.tab.replace(/\*/g, '')}</pre>
                    </div>
                    <p class="text-base mb-4">${guitarData.lesson.replace(/\*/g, '')}</p>
                    <div class="bg-blue-50 p-3 rounded">
                        <p class="text-sm italic">💡 ${guitarData.tip.replace(/\*/g, '')}</p>
                    </div>
                </div>
            `;
        } else {
             contentEl.innerHTML = '<p>Could not retrieve a guitar lesson. The response was empty.</p>';
        }
    }

    async function fetchAndShowHistory() {
        const modal = document.getElementById('history-modal');
        const contentEl = document.getElementById('history-content');
        if (!modal || !contentEl) return;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        contentEl.innerHTML = '<p>Searching YouTube for a history video...</p>';

        try {
            // The prompt asks for a specific format to make parsing easier.
            const prompt = `Using Google Search, find one highly-rated and popular history documentary or explainer video on YouTube about World War I or World War II from a reputable source like a well-known documentary channel, museum, or educational institution. Prioritize content that is likely to be permanently available. Respond with only the video title and the direct YouTube URL in this exact format:\nTitle: [video title]\nURL: [video URL]`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{googleSearch: {}}],
                }
            });

            let html = '';

            if (response.text) {
                const text = response.text.trim();
                const lines = text.split('\n');
                const titleLine = lines.find(line => line.toLowerCase().startsWith('title:'));
                const urlLine = lines.find(line => line.toLowerCase().startsWith('url:'));

                if (titleLine && urlLine) {
                    const title = titleLine.split(':').slice(1).join(':').trim();
                    const url = urlLine.split(':').slice(1).join(':').trim();
                    // Create a clickable link for the main content
                    html += `<h4 class="text-lg font-bold mb-2"><a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${title}</a></h4>`;
                    html += `<p class="text-sm"><a href="${url}" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:underline">${url}</a></p>`;
                } else {
                    // Fallback if formatting isn't perfect, just show the raw text
                    html += `<p>${text.replace(/\n/g, '<br>')}</p>`;
                }
            } else {
                html += `<p>Could not find a history video at this time.</p>`;
            }

            // Display grounding sources as well for reference
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks && groundingChunks.length > 0) {
                html += '<hr class="my-4 border-gray-300">';
                html += '<h4 class="text-md font-bold mb-2">Sources:</h4>';
                html += '<ul class="list-disc pl-5 text-sm space-y-1">';
                const uniqueSources = Array.from(new Map(groundingChunks.map(chunk => [chunk.web?.uri, chunk])).values());

                uniqueSources.forEach(chunk => {
                    if (chunk.web && chunk.web.uri) {
                        html += `<li><a href="${chunk.web.uri}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${chunk.web.title || chunk.web.uri}</a></li>`;
                    }
                });
                html += '</ul>';
            }

            contentEl.innerHTML = html;

        } catch (error) {
            console.error("Error fetching History video:", error);
            contentEl.innerHTML = '<p>An API Error occurred. Could not fetch a history video at this time.</p>';
        }
    }

    // --- GEMINI API LOGIC ---
    async function getReflectionPrompt(pointer: string) {
        const reflectionPromptDisplay = document.getElementById('reflection-prompt-display-day');
        if (!reflectionPromptDisplay) return;
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
    
    async function askGemini(prompt: string) {
        const chatHistoryDisplay = document.getElementById('chat-history');
        if (!chatHistoryDisplay) return;
        
        // Rate limiting
        const now = Date.now();
        if (now - lastApiCall < API_RATE_LIMIT) {
            chatHistory.push({ role: "model", text: "Please wait a moment before sending another message." });
            renderChatHistory();
            return;
        }
        lastApiCall = now;
        
        chatHistory.push({ role: "user", text: prompt });
        renderChatHistory();
        
        const thinkingEl = document.createElement('div');
        thinkingEl.className = 'chat-message gemini-message';
        thinkingEl.textContent = '...';
        chatHistoryDisplay.appendChild(thinkingEl);
        chatHistoryDisplay.scrollTop = chatHistoryDisplay.scrollHeight;

        try {
            // Use the currently active chat instance (main or contextual)
            const response: GenerateContentResponse = await chat.sendMessage({ message: prompt });
            thinkingEl.remove();
            
            const geminiResponse = response.text.replace(/\*/g, '');
            if (geminiResponse) {
                chatHistory.push({ role: "model", text: geminiResponse });
            } else {
                 chatHistory.push({ role: "model", text: "I'm sorry, I couldn't process that." });
            }
            
            // If this was a message in the main chat, persist the history
            if (chat === mainChat) {
                mainChatHistory = [...chatHistory];
                await saveChatHistory();
            }

        } catch (error) {
             console.error("Gemini API Error:", error);
             thinkingEl.remove();
             
             // Provide more specific error messages
             let errorMessage = "There was an error. Please try again.";
             if (error instanceof Error) {
                 if (error.message.includes('API_KEY')) {
                     errorMessage = "API key not configured. Please check your environment variables.";
                 } else if (error.message.includes('quota')) {
                     errorMessage = "API quota exceeded. Please try again later.";
                 } else if (error.message.includes('network')) {
                     errorMessage = "Network error. Please check your connection.";
                 }
             }
             
             chatHistory.push({ role: "model", text: errorMessage });
        }
        renderChatHistory();
    }

    async function getSolutionExplanation(questionPrompt: string, questionSolution: string): Promise<string> {
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
                type: Type.OBJECT,
                properties: {
                    problemExplanation: {
                        type: Type.STRING,
                        description: "An explanation of what the problem is asking."
                    },
                    professionalApproach: {
                        type: Type.STRING,
                        description: "How a professional would approach the problem, including best practices."
                    },
                    formattedSolution: {
                        type: Type.STRING,
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
                    responseSchema: responseSchema,
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
    
    // --- RENDER FUNCTIONS ---
    function renderTasks(listId: string) {
        const listEl = document.getElementById(listId);
        if(!listEl) return;
        listEl.innerHTML = tasks.map((task, index) => `
            <div class="task-item">
                <input type="checkbox" data-index="${index}" ${task.completed ? 'checked' : ''}>
                <label class="${task.completed ? 'completed' : ''}">${task.text}</label>
                <button class="delete-btn" data-index="${index}">&times;</button>
            </div>
        `).join('');
    }

    // Original module rendering functions (kept for compatibility)
    function renderDayModule() {
        const lifePointerEl = document.getElementById('life-pointer-display-day');
        if (lifePointerEl) lifePointerEl.textContent = todaysLifePointer;
        
        const reflectionPromptEl = document.getElementById('reflection-prompt-display-day');
        if (reflectionPromptEl) reflectionPromptEl.textContent = '';

        renderTasks('tasks-list-day');
    }

    function renderCrossoverModule() {
        const lifePointerEl = document.getElementById('life-pointer-display-crossover');
        if (lifePointerEl) lifePointerEl.textContent = todaysLifePointer;

        renderTasks('tasks-list-crossover');
    }

    function renderNightModule() {
        const dayOfYear = getDayOfYear(previewContentDate);
        const tomorrowsLifePointer = lifePointers[(dayOfYear - 1) % lifePointers.length];
        
        const lifePointerEl = document.getElementById('life-pointer-display-night');
        if (lifePointerEl) lifePointerEl.textContent = tomorrowsLifePointer;
        
        renderTasks('tasks-list-night');
    }
    
    function renderChatHistory() {
        const chatHistoryDisplay = document.getElementById('chat-history');
        if (!chatHistoryDisplay) return;
        chatHistoryDisplay.innerHTML = chatHistory.map(msg => 
            `<div class="chat-message ${msg.role === 'user' ? 'user-message' : 'gemini-message'}">${msg.text}</div>`
        ).join('');
        chatHistoryDisplay.scrollTop = chatHistoryDisplay.scrollHeight;
    }
    
    async function mainRender() {
        // Recalculate time-sensitive variables each time render is called
        updateDateDerivedData(); 
        const { hour } = getCanonicalTime(); // Use canonical hour

        await loadCoreData();
        await loadTasks(); // Load the latest tasks from storage to sync on each 5min interval.

        const sunIcon = document.getElementById('sun-icon') as HTMLElement;
        const sunsetIcon = document.getElementById('sunset-icon') as HTMLElement;
        const moonIcon = document.getElementById('moon-icon') as HTMLElement;
        const dayModule = document.getElementById('day-module') as HTMLElement;
        const crossoverModule = document.getElementById('crossover-module') as HTMLElement;
        const nightModule = document.getElementById('night-module') as HTMLElement;
        
        [sunIcon, sunsetIcon, moonIcon].forEach(icon => {
            if (icon) icon.style.display = 'none'
        });
        [dayModule, crossoverModule, nightModule].forEach(m => {
            if(m) m.classList.remove('active');
        });

        if (hour >= 8 && hour < 17) {
            if(sunIcon) sunIcon.style.display = 'inline-block';
            if(dayModule) dayModule.classList.add('active');
            await renderDayModule();
        } else if (hour >= 17 && hour < 18) {
            if (sunsetIcon) sunsetIcon.style.display = 'inline-block';
            if(crossoverModule) crossoverModule.classList.add('active');
            await renderCrossoverModule();
        } else {
            if (moonIcon) moonIcon.style.display = 'inline-block';
            if(nightModule) nightModule.classList.add('active');
            await renderNightModule();
        }
    }

    // --- MODAL DISPLAY FUNCTIONS ---
    async function showFrenchModal(mode: 'today' | 'tomorrow' | 'archive') {
        const modal = document.getElementById('frenchy-modal');
        if (!modal) return;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        const titleEl = modal.querySelector('#modal-frenchy-title') as HTMLElement;
        const tableBodyEl = modal.querySelector('#modal-frenchy-table-body') as HTMLElement;
        const date = mode === 'today' ? activeContentDate : mode === 'tomorrow' ? previewContentDate : archiveDate;

        // Gate for tomorrow's content, ensuring it's only shown after 5 PM the day before.
        if (mode === 'tomorrow' && !isContentReadyForPreview(date)) {
            titleEl.textContent = 'French';
            tableBodyEl.innerHTML = `<tr><td colspan="5" class="text-center p-4">The lesson for tomorrow will be available after 5 PM.</td></tr>`;
            return;
        }

        titleEl.textContent = 'French';
        tableBodyEl.innerHTML = `<tr><td colspan="5" class="text-center p-4">Loading French lesson...</td></tr>`;

        try {
            const soundData = await getOrGenerateDynamicContent('french-sound', date);

            if (!soundData || !soundData.sound || !soundData.words) {
                 titleEl.textContent = `French: Error`;
                 tableBodyEl.innerHTML = `<tr><td colspan="5" class="text-center p-4">Could not load French lesson data.</td></tr>`;
            } else {
                titleEl.textContent = `French: " ${soundData.sound} "`;
                tableBodyEl.innerHTML = soundData.words.map((item: any, index: number) => 
                    `<tr><td class="font-bold text-center">${index + 1}</td><td>${item.word}</td><td>${item.cue}</td><td>${item.meaning}</td><td class="text-center"><button class="play-btn" data-word="${item.word}">🔊</button></td></tr>`
                ).join('');
            }
        } catch (error) {
            console.error('Error showing French modal:', error);
            titleEl.textContent = 'French: Error';
            tableBodyEl.innerHTML = `<tr><td colspan="5" class="text-center p-4">An error occurred while loading the lesson.</td></tr>`;
        }
    }
    
    async function showFoodModal(mode: 'today' | 'tomorrow' | 'archive') {
        const modal = document.getElementById('food-modal');
        if (!modal) return;
        
        const contentEl = modal.querySelector('#food-plan-content') as HTMLElement;
        const titleEl = modal.querySelector('#food-modal-title') as HTMLElement;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        let date: Date, title: string, key: string;

        if (mode === 'today') {
            date = activeContentDate;
            title = "Today's Food";
            key = todayKey;
        } else if (mode === 'tomorrow') {
            date = previewContentDate;
            title = "Tomorrow's Food";
            key = tomorrowKey;
        } else { // archive
            date = archiveDate;
            title = "Previous Day's Food";
            key = archiveKey;
        }

        titleEl.textContent = title;

        // Gate for tomorrow's content, ensuring it's only shown after 5 PM the day before.
        if (mode === 'tomorrow' && !isContentReadyForPreview(date)) {
            contentEl.innerHTML = "<p>The plan for tomorrow will be available after 5 PM.</p>";
            return;
        }

        contentEl.innerHTML = '<p>Loading food plan...</p>';
        
        try {
            const plan = await getOrGeneratePlanForDate(date, key);
            contentEl.innerHTML = plan.replace(/\n/g, '<br>');
        } catch (error) {
            console.error('Error fetching food plan for modal', error);
            contentEl.innerHTML = '<p>Could not load the food plan.</p>';
        }
    }

    async function showAnalyticsModal(mode: 'today' | 'tomorrow' | 'archive') {
        const modal = document.getElementById('analytics-engineer-modal');
        const contentEl = document.getElementById('analytics-engineer-content');
        if (!modal || !contentEl) return;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        const date = mode === 'today' ? activeContentDate : mode === 'tomorrow' ? previewContentDate : archiveDate;

        // Gate for tomorrow's content, ensuring it's only shown after 5 PM the day before.
        if (mode === 'tomorrow' && !isContentReadyForPreview(date)) {
            contentEl.innerHTML = '<p>Topics for tomorrow will be available after 5 PM.</p>';
            return;
        }

        contentEl.innerHTML = '<p>Loading topics...</p>';

        try {
            const data = await getOrGenerateDynamicContent('analytics', date);
            if (!data) {
                contentEl.innerHTML = '<p>Content is not available. Please try again later.</p>';
                return;
            }

            const topics = [
                { type: 'SQL', data: data.sql, isQuestion: true },
                { type: 'DAX', data: data.dax, isQuestion: true },
                { type: 'Snowflake', data: data.snowflake, isQuestion: true },
                { type: 'dbt', data: data.dbt, isQuestion: true },
                { type: 'Data Management', data: data.dataManagement },
                { type: 'Data Quality', data: data.dataQuality }
            ];

            contentEl.innerHTML = topics.map(topic => {
                if (!topic.data) return ''; // Gracefully handle if data is missing

                if (topic.isQuestion) {
                    // Use btoa to safely encode the data for attributes. It's simpler than encodeURIComponent for this case.
                    const encodedPrompt = btoa(topic.data.prompt);
                    const encodedSolution = btoa(topic.data.solution);

                     return `
                        <div class="topic-section border-b last:border-b-0 pb-4 mb-4">
                            <h4 class="font-bold text-md">${topic.type}: ${topic.data.title}</h4>
                            <p class="text-sm mt-1">${topic.data.prompt.replace(/\n/g, '<br>')}</p>
                            <div class="text-center mt-3">
                                <button class="solution-btn gemini-btn" data-prompt="${encodedPrompt}" data-solution="${encodedSolution}">Show Solution</button>
                            </div>
                            <div class="solution-content text-sm mt-4 p-4 border-l-4 border-gray-200 bg-gray-50" style="display: none;"></div>
                        </div>
                    `;
                } else if (topic.data.explanation) { // This is for DMBOK
                    const formattedExplanation = topic.data.explanation.replace(/\n/g, '<br>');
                    return `
                        <div class="topic-section border-b last:border-b-0 pb-4 mb-4">
                            <h4 class="font-bold text-md">${topic.type}: ${topic.data.title}</h4>
                            <div class="text-sm mt-2">${formattedExplanation}</div>
                        </div>
                    `;
                } else if (topic.data.issues) { // This is for the new Data Quality topic
                    return `
                        <div class="topic-section border-b last:border-b-0 pb-4 mb-4">
                            <h4 class="font-bold text-md">${topic.type}: ${topic.data.title}</h4>
                            <div class="text-sm mt-2">
                                <p class="mb-2"><strong>Data Type:</strong> ${topic.data.dataType}</p>
                                <h5 class="font-semibold mt-3 mb-1">Potential Issues:</h5>
                                <ul class="list-disc pl-5 space-y-1">
                                    ${topic.data.issues.map((issue: string) => `<li>${issue.replace(/\n/g, '<br>')}</li>`).join('')}
                                </ul>
                                <h5 class="font-semibold mt-3 mb-1">Corrective Transformations:</h5>
                                <ul class="list-disc pl-5 space-y-1">
                                    ${topic.data.transformations.map((t: string) => `<li>${t.replace(/\n/g, '<br>')}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    `;
                }
                return '';
            }).join('');
        } catch (error) {
            console.error("Error showing analytics modal:", error);
            contentEl.innerHTML = '<p>An error occurred while fetching analytics content.</p>';
        }
    }
    
    async function showHoodModal(mode: 'today' | 'tomorrow' | 'archive') {
        const modal = document.getElementById('hood-modal');
        if (!modal) return;
        const titleEl = modal.querySelector('#hood-modal-title') as HTMLElement;
        const contentEl = modal.querySelector('#hood-explanation-content') as HTMLElement;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        const date = mode === 'today' ? activeContentDate : mode === 'tomorrow' ? previewContentDate : archiveDate;

        // Gate for tomorrow's content, ensuring it's only shown after 5 PM the day before.
        if (mode === 'tomorrow' && !isContentReadyForPreview(date)) {
            titleEl.textContent = 'Under the Hood';
            contentEl.innerHTML = '<p>The topic for tomorrow will be available after 5 PM.</p>';
            return;
        }

        titleEl.textContent = 'Under the Hood';
        contentEl.innerHTML = '<p>Loading topic...</p>';
        
        try {
            const data = await getOrGenerateDynamicContent('transportation-physics', date);
            if (!data || !data.title || !data.explanation) {
                titleEl.textContent = 'Error';
                contentEl.innerHTML = '<p>Content is not available. Please try again later.</p>';
                return;
            }
            
            titleEl.textContent = `Under the Hood: ${data.title}`;
            contentEl.innerHTML = data.explanation.replace(/\n/g, '<br>');
        } catch (error) {
            console.error("Error showing under the hood modal:", error);
            titleEl.textContent = 'Error';
            contentEl.innerHTML = '<p>An error occurred while fetching content.</p>';
        }
    }

    function renderArchive() {
        const archiveList = document.getElementById('archive-list');
        if (!archiveList) return;
        const archiveModal = document.getElementById('archive-modal');
        
        // Get archived content for the archive date
        const archivedContent = getArchivedContent(archiveKey);
        
        if (!archivedContent) {
            archiveList.innerHTML = '<p class="text-gray-500 p-4">No archived content available for this date.</p>';
            return;
        }
        
        const archiveItems: { label: string, action: () => void }[] = [
            { 
                label: `Archived French (${archivedContent.date})`, 
                action: () => showArchivedFrenchModal(archivedContent) 
            },
            { 
                label: `Archived Food (${archivedContent.date})`, 
                action: () => showArchivedFoodModal(archivedContent) 
            },
            { 
                label: `Archived Analytics (${archivedContent.date})`, 
                action: () => showArchivedAnalyticsModal(archivedContent) 
            },
            { 
                label: `Archived Hood (${archivedContent.date})`, 
                action: () => showArchivedHoodModal(archivedContent) 
            }
        ];
        
        archiveList.innerHTML = '';
        archiveItems.forEach(item => {
            const button = document.createElement('button');
            button.className = 'p-3 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors text-left';
            button.textContent = item.label;
            button.onclick = () => {
                archiveModal?.classList.add('hidden');
                archiveModal?.classList.remove('flex');
                item.action();
            };
            archiveList.appendChild(button);
        });
    }

    // --- INITIALIZATION ---
    function setupEventListeners() {
        const appContainer = document.getElementById('app-container');
        if (!appContainer) return;

        // Delegated click listener for the entire app
        appContainer.addEventListener('click', e => {
            const target = e.target as HTMLElement;
            
            // --- Quantum Timer ---
            if (target.closest('#quantum-timer-btn')) {
                if (isQuantumActive) {
                    stopQuantumTimer();
                } else {
                    startQuantumTimer();
                }
                return;
            }

            // --- Modal Closers (handle first) ---
            const activeModal = target.closest('.fixed.flex');
            if (activeModal && (target.closest('.modal-close-btn') || target === activeModal)) {
                activeModal.classList.add('hidden');
                activeModal.classList.remove('flex');
                return; // Stop further processing
            }

            // --- Modal Openers (On-Demand Loading) ---
            if (target.closest('#frenchy-clickable-day')) return showFrenchModal('today');
            if (target.closest('#food-clickable-day')) return showFoodModal('today');
            if (target.closest('#analytics-clickable-day')) return showAnalyticsModal('today');
            if (target.closest('#hood-clickable-day')) return showHoodModal('today');
            
            if (target.closest('#frenchy-preview-clickable-crossover') || target.closest('#frenchy-preview-clickable-night')) return showFrenchModal('tomorrow');
            if (target.closest('#food-preview-clickable-crossover') || target.closest('#food-preview-clickable-night')) return showFoodModal('tomorrow');
            if (target.closest('#analytics-preview-clickable-crossover') || target.closest('#analytics-preview-clickable-night')) return showAnalyticsModal('tomorrow');
            if (target.closest('#hood-preview-clickable-crossover') || target.closest('#hood-preview-clickable-night')) return showHoodModal('tomorrow');

            if (target.closest('#geopolitics-clickable')) return fetchAndShowWorldOrder();
            if (target.closest('#tennis-clickable')) return fetchAndShowTennisMatches();
            if (target.closest('#coffee-clickable')) return fetchAndShowCoffeeTip();
            if (target.closest('#guitar-clickable')) return fetchAndShowGuitarTab();
            if (target.closest('#history-clickable')) return fetchAndShowHistory();


            const archiveModal = document.getElementById('archive-modal');
            if (target.closest('#archive-open-btn') && archiveModal) {
                 renderArchive(); // Re-render archive to ensure it has latest daily data
                 archiveModal.classList.remove('hidden');
                 archiveModal.classList.add('flex');
                 return;
            }

            const chatModal = document.getElementById('chat-modal');
            if (target.closest('#chat-open-btn') && chatModal) {
                // When opening the main chat, set the active chat to the persistent one.
                chat = mainChat;
                chatHistory = [...mainChatHistory]; // Use a copy
                renderChatHistory(); // Render the persistent conversation history
                chatModal.classList.remove('hidden');
                chatModal.classList.add('flex');
                return;
            }

            // --- Task List Interactions ---
            if (target.matches('.delete-btn')) {
                const index = parseInt(target.dataset.index || '-1');
                if (index > -1) {
                    tasks.splice(index, 1);
                    saveTasks();
                    mainRender(); // Re-render the active module to update the tasks list
                }
                return;
            }
            if (target.matches('input[type="checkbox"]')) {
                const index = parseInt((target as HTMLInputElement).dataset.index || '-1');
                if (index > -1) {
                    tasks[index].completed = !tasks[index].completed;
                    saveTasks();
                    mainRender(); // Re-render the active module to update the tasks list
                }
                return;
            }

            // --- Audio Playback ---
            const playBtn = target.closest('.play-btn');
            if (playBtn) {
                const synth = window.speechSynthesis;
                const wordToSay = playBtn.getAttribute('data-word');
                if (synth.speaking) synth.cancel();
                if (wordToSay) {
                    const utterance = new SpeechSynthesisUtterance(wordToSay);
                    utterance.lang = 'fr-FR';
                    synth.speak(utterance);
                }
                return;
            }

            // --- Other Buttons ---
            if (target.closest('#reflection-btn-day')) return getReflectionPrompt(todaysLifePointer);

            const solutionBtn = target.closest('.solution-btn');
            if (solutionBtn) {
                const topicSection = solutionBtn.closest('.topic-section');
                if (topicSection) {
                    const solutionEl = topicSection.querySelector('.solution-content') as HTMLElement;
                    const button = solutionBtn as HTMLButtonElement;
            
                    const isVisible = solutionEl.style.display !== 'none';
            
                    if (isVisible) {
                        solutionEl.style.display = 'none';
                        button.textContent = 'Show Solution';
                    } else {
                        solutionEl.style.display = 'block';
                        button.textContent = 'Hide Solution';
            
                        // If it's the first time opening, generate content.
                        if (solutionEl.innerHTML.trim() === '') {
                            const encodedPrompt = button.dataset.prompt;
                            const encodedSolution = button.dataset.solution;
                            
                            if (encodedPrompt && encodedSolution) {
                                (async () => {
                                    button.disabled = true;
                                    button.textContent = 'Explaining...';
                                    solutionEl.innerHTML = '<p class="text-center text-gray-500">Generating a detailed explanation...</p>';
            
                                    const prompt = atob(encodedPrompt);
                                    const solution = atob(encodedSolution);
                                    const explanationHtml = await getSolutionExplanation(prompt, solution);
            
                                    solutionEl.innerHTML = explanationHtml;
                                    button.disabled = false;
                                    // Re-check visibility in case user clicked again while loading
                                    if (solutionEl.style.display !== 'none') {
                                        button.textContent = 'Hide Solution';
                                    } else {
                                        button.textContent = 'Show Solution';
                                    }
                                })();
                            }
                        }
                    }
                }
                return;
            }

            // --- Contextual Chat ---
            const chatContextBtn = target.closest('.chat-context-btn');
            if (chatContextBtn) {
                const modal = target.closest('.fixed.flex');
                if (modal) {
                    let systemInstruction = '';
                    const modalId = modal.id;

                    switch (modalId) {
                        case 'frenchy-modal': {
                            const frenchyTitle = modal.querySelector('#modal-frenchy-title')?.textContent || '';
                            const frenchyTable = (modal.querySelector('#modal-frenchy-table-body') as HTMLElement)?.innerText || '';
                            systemInstruction = `The user is asking about the following French lesson. Act as a helpful French tutor.\n\nContext:\n${frenchyTitle}\n${frenchyTable}`;
                            break;
                        }
                        case 'food-modal': {
                            const foodTitle = modal.querySelector('#food-modal-title')?.textContent || '';
                            const foodContent = (modal.querySelector('#food-plan-content') as HTMLElement)?.innerText || '';
                            systemInstruction = `The user is asking about a meal plan. Act as a helpful nutritionist.\n\nContext:\n${foodTitle}\n${foodContent}`;
                            break;
                        }
                        case 'hood-modal': {
                            const hoodTitle = modal.querySelector('#hood-modal-title')?.textContent || '';
                            const hoodContent = (modal.querySelector('#hood-explanation-content') as HTMLElement)?.innerText || '';
                            systemInstruction = `The user is asking about a physics concept related to transportation. Act as a knowledgeable physicist who can explain things simply.\n\nContext:\n${hoodTitle}\n${hoodContent}`;
                            break;
                        }
                        case 'geopolitics-modal': {
                            const context = (modal.querySelector('#geopolitics-headlines-content') as HTMLElement)?.innerText || '';
                            systemInstruction = `The user is asking about these geopolitical headlines. Provide a detailed summary and explain their significance.\n\nContext:\n${context}`;
                            break;
                        }
                        case 'tennis-modal': {
                            const context = (modal.querySelector('#tennis-content') as HTMLElement)?.innerText || '';
                            systemInstruction = `The user is asking about these tennis matches. Provide more details like the tournament name, round, or what the scores mean.\n\nContext:\n${context}`;
                            break;
                        }
                        case 'coffee-modal': {
                            const context = (modal.querySelector('#coffee-content') as HTMLElement)?.innerText || '';
                            systemInstruction = `The user is asking about this coffee shop lesson. Expand on it, explain the business reasoning, and how to implement it.\n\nContext:\n${context}`;
                            break;
                        }
                        case 'guitar-modal': {
                            const context = (modal.querySelector('#guitar-content') as HTMLElement)?.innerText || '';
                            systemInstruction = `The user is asking about this guitar lesson. Provide more details about the technique, suggest practice exercises, or explain music theory concepts.\n\nContext:\n${context}`;
                            break;
                        }
                        case 'history-modal': {
                            const context = (modal.querySelector('#history-content') as HTMLElement)?.innerText || '';
                            systemInstruction = `The user is asking about this recommended history video. Provide more context about the topic, creator, or historical period discussed.\n\nContext:\n${context}`;
                            break;
                        }
                        case 'analytics-engineer-modal': {
                            const context = (modal.querySelector('#analytics-engineer-content') as HTMLElement)?.innerText || '';
                            systemInstruction = `The user is asking about these analytics topics. Act as a senior analytics engineer and provide detailed explanations.\n\nContext:\n${context}`;
                            break;
                        }
                    }

                    if (systemInstruction) {
                        // Close current modal
                        modal.classList.add('hidden');
                        modal.classList.remove('flex');

                        const chatModalEl = document.getElementById('chat-modal');
                        const chatInputEl = document.getElementById('chat-input') as HTMLInputElement;
                        
                        if (chatModalEl && chatInputEl) {
                            // For contextual chat, create a NEW, temporary chat instance.
                            // Do NOT touch mainChat or mainChatHistory.
                            chat = ai.chats.create({ 
                                model: 'gemini-2.5-flash',
                                config: {
                                    systemInstruction: systemInstruction
                                }
                            });
                            // Use a temporary, empty history for the UI.
                            chatHistory = []; 
                            
                            renderChatHistory();

                            // Open the chat modal
                            chatModalEl.classList.remove('hidden');
                            chatModalEl.classList.add('flex');

                            // Clear the input field and focus it
                            chatInputEl.value = '';
                            chatInputEl.focus();
                        }
                    }
                }
                return; // Stop further processing
            }
        });

        // Form submissions
        function handleTaskSubmit(e: Event) {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const input = form.querySelector('input[type="text"]') as HTMLInputElement;
            const taskText = input.value.trim();
            
            // Input validation
            if (!taskText) {
                return;
            }
            
            // Sanitize input (basic)
            const sanitizedText = escapeHtml(taskText).substring(0, 200); // Limit length
            
            if (sanitizedText) {
                tasks.push({ text: sanitizedText, completed: false });
                input.value = '';
                saveTasks();
                mainRender(); // Re-render the view to show the new task
            }
        }
        document.getElementById('add-task-form-day')?.addEventListener('submit', handleTaskSubmit);
        document.getElementById('add-task-form-night')?.addEventListener('submit', handleTaskSubmit);
        
        document.getElementById('chat-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const chatInput = document.getElementById('chat-input') as HTMLInputElement;
            const prompt = chatInput.value.trim();
            if (prompt) {
                askGemini(prompt);
                chatInput.value = '';
            }
        });
    }
    
    // Error boundary function
    function handleGlobalError(error: Error, context: string) {
        console.error(`Error in ${context}:`, error);
        
        // Show user-friendly error message
        const statusEl = document.getElementById('sync-status');
        if (statusEl) {
            statusEl.innerHTML = `⚠️ Error in ${context}. Please refresh the page.`;
            statusEl.classList.remove('hidden');
            setTimeout(() => {
                statusEl.classList.add('hidden');
            }, 5000);
        }
    }

    async function initializeApp() {
        try {
            quantumTimerBtn = document.getElementById('quantum-timer-btn');
            quantumTimerDisplay = document.getElementById('quantum-timer-display');
            updateQuantumTimerDisplay(); // Set the initial timer text

            function updateTime() {
                const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
                const el = document.getElementById('current-datetime');
                if (el) el.textContent = new Date().toLocaleString('en-CA', options);
            }
            updateTime();
            
            // Load persistent data on startup
            await loadChatHistory();

            // Initialize the main chat instance with its loaded history
            mainChat = ai.chats.create({ model: 'gemini-2.5-flash', history: mainChatHistory });
            
            await mainRender();
            setupEventListeners();

            setInterval(updateTime, 1000);
            setInterval(async () => {
                try {
                    await mainRender();
                } catch (error) {
                    handleGlobalError(error as Error, 'periodic update');
                }
            }, 60000 * 5); // every 5 minutes
        } catch (error) {
            handleGlobalError(error as Error, 'app initialization');
        }
    }

    initializeApp();

    // --- ENHANCED CONTENT FLOW SYSTEM ---
    
    /**
     * Enhanced content generation specifically for CrossOver Module (5 PM - 6 PM)
     */
    async function triggerCrossOverContentGeneration(): Promise<void> {
        const { hour } = getCanonicalTime();
        
        // Only generate during CrossOver Module (5 PM - 6 PM)
        if (hour < 17 || hour >= 18) {
            return;
        }
        
        const todayKey = new Date().toISOString().split('T')[0];
        const generationKey = `cross-over-generation-${todayKey}`;
        
        // Check if we've already generated content for tomorrow today
        if (localStorage.getItem(generationKey)) {
            return;
        }
        
        console.log('🔄 CrossOver Module: Starting content generation for tomorrow...');
        showSyncStatus('🔄 Generating tomorrow\'s content...', false);
        
        try {
            // Generate all content types for tomorrow
            const promises = [
                getOrGeneratePlanForDate(previewContentDate, tomorrowKey),
                getOrGenerateDynamicContent('french-sound', previewContentDate),
                getOrGenerateDynamicContent('analytics', previewContentDate),
                getOrGenerateDynamicContent('transportation-physics', previewContentDate)
            ];
            
            await Promise.all(promises);
            
            // Mark that we've generated content for tomorrow
            localStorage.setItem(generationKey, new Date().toISOString());
            console.log('✅ CrossOver Module: Content generation completed');
            showSyncStatus('✅ Tomorrow\'s content generated successfully!', true);
            
        } catch (error) {
            console.error('❌ CrossOver Module: Content generation failed', error);
            showSyncStatus('⚠️ Content generation failed. Will retry.', true);
        }
    }
    
    /**
     * Archives today's content during Night Module (6 PM - 8 AM)
     */
    async function archiveTodaysContent(): Promise<void> {
        const { hour } = getCanonicalTime();
        
        // Only archive during Night Module (6 PM - 8 AM)
        if (hour >= 8 && hour < 18) {
            return;
        }
        
        const todayKey = new Date().toISOString().split('T')[0];
        const archiveKey = `archived-${todayKey}`;
        
        // Check if we've already archived today's content
        if (localStorage.getItem(archiveKey)) {
            return;
        }
        
        console.log('📦 Night Module: Archiving today\'s content...');
        
        try {
            // Collect all of today's content
            const archiveData = {
                date: todayKey,
                archivedAt: new Date().toISOString(),
                foodPlan: await getOrGeneratePlanForDate(activeContentDate, todayKey),
                frenchContent: await getOrGenerateDynamicContent('french-sound', activeContentDate),
                analyticsContent: await getOrGenerateDynamicContent('analytics', activeContentDate),
                transportationContent: await getOrGenerateDynamicContent('transportation-physics', activeContentDate),
                lifePointer: todaysLifePointer
            };
            
            // Save to archive
            localStorage.setItem(archiveKey, JSON.stringify(archiveData));
            console.log('✅ Night Module: Content archived successfully');
            
        } catch (error) {
            console.error('❌ Night Module: Content archiving failed', error);
        }
    }
    
    /**
     * Loads archived content for display
     */
    function getArchivedContent(dateKey: string): any {
        const archiveKey = `archived-${dateKey}`;
        const archivedData = localStorage.getItem(archiveKey);
        
        if (archivedData) {
            try {
                return JSON.parse(archivedData);
            } catch (error) {
                console.error('Error parsing archived content:', error);
                return null;
            }
        }
        
        return null;
    }
    
    // --- ARCHIVED CONTENT MODAL FUNCTIONS ---
    
    function showArchivedFrenchModal(archivedContent: any) {
        const modal = document.getElementById('frenchy-modal');
        if (!modal) return;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        const titleEl = modal.querySelector('#modal-frenchy-title') as HTMLElement;
        const tableBodyEl = modal.querySelector('#modal-frenchy-table-body') as HTMLElement;
        
        titleEl.textContent = `French (Archived - ${archivedContent.date})`;
        
        if (archivedContent.frenchContent && archivedContent.frenchContent.sound && archivedContent.frenchContent.words) {
            const { sound, words } = archivedContent.frenchContent;
            tableBodyEl.innerHTML = `
                <tr>
                    <td class="p-3 border-b">${escapeHtml(sound)}</td>
                    <td class="p-3 border-b">${escapeHtml(words.join(', '))}</td>
                    <td class="p-3 border-b">Archived</td>
                </tr>
            `;
        } else {
            tableBodyEl.innerHTML = `<tr><td colspan="3" class="text-center p-4">No archived French content available.</td></tr>`;
        }
    }
    
    function showArchivedFoodModal(archivedContent: any) {
        const modal = document.getElementById('food-modal');
        if (!modal) return;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        const titleEl = modal.querySelector('#modal-food-title') as HTMLElement;
        const contentEl = modal.querySelector('#modal-food-content') as HTMLElement;
        
        titleEl.textContent = `Food Plan (Archived - ${archivedContent.date})`;
        contentEl.innerHTML = `<div class="p-4">${escapeHtml(archivedContent.foodPlan || 'No archived food plan available.')}</div>`;
    }
    
    function showArchivedAnalyticsModal(archivedContent: any) {
        const modal = document.getElementById('analytics-modal');
        if (!modal) return;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        const titleEl = modal.querySelector('#modal-analytics-title') as HTMLElement;
        const contentEl = modal.querySelector('#modal-analytics-content') as HTMLElement;
        
        titleEl.textContent = `Analytics (Archived - ${archivedContent.date})`;
        
        if (archivedContent.analyticsContent && archivedContent.analyticsContent.insights) {
            contentEl.innerHTML = `<div class="p-4">${escapeHtml(archivedContent.analyticsContent.insights)}</div>`;
        } else {
            contentEl.innerHTML = `<div class="p-4">No archived analytics content available.</div>`;
        }
    }
    
    function showArchivedHoodModal(archivedContent: any) {
        const modal = document.getElementById('hood-modal');
        if (!modal) return;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        const titleEl = modal.querySelector('#modal-hood-title') as HTMLElement;
        const contentEl = modal.querySelector('#modal-hood-content') as HTMLElement;
        
        titleEl.textContent = `Transportation Physics (Archived - ${archivedContent.date})`;
        
        if (archivedContent.transportationContent && archivedContent.transportationContent.physics) {
            contentEl.innerHTML = `<div class="p-4">${escapeHtml(archivedContent.transportationContent.physics)}</div>`;
        } else {
            contentEl.innerHTML = `<div class="p-4">No archived transportation physics content available.</div>`;
        }
    }

    // --- ENHANCED MODULE RENDERING FUNCTIONS ---
    
    async function renderDayModule() {
        const lifePointerEl = document.getElementById('life-pointer-display-day');
        if (lifePointerEl) lifePointerEl.textContent = todaysLifePointer;
        
        const reflectionPromptEl = document.getElementById('reflection-prompt-display-day');
        if (reflectionPromptEl) reflectionPromptEl.textContent = '';

        renderTasks('tasks-list-day');
        
        // Day Module: Content from yesterday's Night Module preview is now active
        console.log('☀️ Day Module: Using content that was previewed in Night Module');
    }

    async function renderCrossoverModule() {
        const lifePointerEl = document.getElementById('life-pointer-display-crossover');
        if (lifePointerEl) lifePointerEl.textContent = todaysLifePointer;

        renderTasks('tasks-list-crossover');
        
        // CrossOver Module: Generate tomorrow's content
        await triggerCrossOverContentGeneration();
    }

    async function renderNightModule() {
        const dayOfYear = getDayOfYear(previewContentDate);
        const tomorrowsLifePointer = lifePointers[(dayOfYear - 1) % lifePointers.length];
        
        const lifePointerEl = document.getElementById('life-pointer-display-night');
        if (lifePointerEl) lifePointerEl.textContent = tomorrowsLifePointer;
        
        renderTasks('tasks-list-night');
        
        // Night Module: Archive today's content and show tomorrow's preview
        await archiveTodaysContent();
        console.log('🌙 Night Module: Today\'s content archived, tomorrow\'s content previewed');
    }
});