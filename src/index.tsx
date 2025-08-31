import { Chat, GenerateContentResponse, Type } from "@google/genai";

import { escapeHtml } from "./utils/escapeHtml";
import { getDayOfYear } from "./utils/date";
import { getCanonicalTime, isContentReadyForPreview } from "./core/time";
import { Task, ChatMessage, PoetrySelection } from "./types";
import { loadTasks, saveTasks, loadChatHistory, saveChatHistory, loadPoetryRecents, savePoetryRecents, recordPoetrySelection } from "./core/persistence";
import { initializeQuantumTimer } from "./components/quantumTimer";
import { initializeTaskForms, renderTasks, handleTaskDelete, handleTaskToggle } from "./components/tasks";
import { getOrGenerateDynamicContent, getOrGeneratePlanForDate, ai } from "./api/gemini";
import { initializeModalManager } from "./components/modals/modalManager";

document.addEventListener('DOMContentLoaded', () => {
    // --- DATA ---
    const lifePointers = [
        "Just be there like a tree", "30 minute work quantums", "Director or Actor ?", "Try first", "Don't take your mind seriously", "It's not about me!", "Never steal the thunder", "Night divides the day", "Only person that can help you is YOU", "All IN", "It is happening now", "Enjoy imperfections", "Be a role model not a teacher", "Listen to your body", "Transform your company (Take actions 5 years ahead)", "Wait and Absorb - Everything is human mind made!", "No substitute to hardwork", "Sleep over it", "Dance in the Dance of Strangers", "Beyond thoughts - You are more than your thoughts", "Respond to change vs Following a plan", "Energy optimization instead of Time optimization", "Break - fast, Break it well!", "Slowly is the only fastest way to success", "Only Dare required is Dare to try", "SPEAK UP - ASK!", "Be courageous to listen to the voice in your head", "Rather than love, than money, than faith, than fame, than fairness, give me truth!!"
    ];
    
    // --- STATE & DERIVED DATA ---
    let todayKey: string, tomorrowKey: string, tomorrowDay: number, archiveKey: string;
    let activeContentDate: Date, previewContentDate: Date, archiveDate: Date;
    let todaysLifePointer: any;
    let isAutoGenerating = false;
    let lastApiCall = 0;
    const API_RATE_LIMIT = 1000; // 1 second between calls

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

    // --- DYNAMIC CONTENT GENERATION & CACHING ---
    
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


    async function loadCoreData() {
        // All dynamic content (food plans, French lessons) is now loaded on-demand
        // when the user clicks to open a modal. This avoids caching content on one
        // device that isn't available on another.
    }

    
    // --- RENDER FUNCTIONS ---
    
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
        tasks = await loadTasks(); // Load the latest tasks from storage to sync on each 5min interval.

        // Always show day module (now our single dynamic module)
        const dayModule = document.getElementById('day-module') as HTMLElement;
        if (dayModule) dayModule.classList.add('active');
        
        // Update dynamic icon based on time
        updateDynamicIcon(hour);
        
        // Always render day content for now
        await renderDayModule();
    }

    function updateDynamicIcon(hour: number) {
        const iconEl = document.getElementById('dynamic-time-icon') as HTMLElement;
        if (!iconEl) return;
        
        if (hour >= 8 && hour < 17) {
            iconEl.textContent = '☀️';
            iconEl.className = 'theme-icon day-mode';
        } else if (hour >= 17 && hour < 18) {
            iconEl.textContent = '🌇';
            iconEl.className = 'theme-icon crossover-mode';
        } else {
            iconEl.textContent = '🌙';
            iconEl.className = 'theme-icon night-mode';
        }
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
            updateDateDerivedData(); // Ensure date-derived data is available
            initializeQuantumTimer();

            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                const modalDependencies = {
                    dates: {
                        active: activeContentDate,
                        preview: previewContentDate,
                        archive: archiveDate,
                    },
                    keys: {
                        today: todayKey,
                        tomorrow: tomorrowKey,
                        archive: archiveKey,
                    },
                    chatState: {
                        chat: chat,
                        mainChat: mainChat,
                        chatHistory: chatHistory,
                        mainChatHistory: mainChatHistory,
                    },
                    renderChatHistory: renderChatHistory,
                };
                initializeModalManager(appContainer, modalDependencies);
                initializeTaskForms(tasks, mainRender);
            }

            function updateTime() {
                const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
                const el = document.getElementById('current-datetime');
                if (el) el.textContent = new Date().toLocaleString('en-CA', options);
            }
            updateTime();
            
            // Load persistent data on startup
            mainChatHistory = await loadChatHistory();

            // Initialize the main chat instance with its loaded history
            mainChat = ai.chats.create({ model: 'gemini-2.5-flash', history: mainChatHistory });
            
            await mainRender();

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
        const { hour, now } = getCanonicalTime();
        
        // Only generate during CrossOver Module (5 PM - 6 PM)
        if (hour < 17 || hour >= 18) {
            console.log(`⏰ CrossOver: Not in CrossOver time window (current hour: ${hour})`);
            return;
        }
        
        const todayKey = new Date().toISOString().split('T')[0];
        const generationKey = `cross-over-generation-${todayKey}`;
        
        // Check if we've already generated content for tomorrow today
        if (localStorage.getItem(generationKey)) {
            console.log('🔄 CrossOver: Content already generated for tomorrow');
            return;
        }
        
        console.log('🚀 CrossOver: Starting content generation for tomorrow...', {
            currentTime: now.toISOString(),
            todayKey: todayKey,
            hour: hour,
            previewContentDate: previewContentDate.toISOString()
        });
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
            console.log('✅ CrossOver: Content generation completed for tomorrow');
            showSyncStatus('✅ Tomorrow\'s content generated successfully!', true);
            
        } catch (error) {
            console.error('❌ CrossOver: Content generation failed', error);
            showSyncStatus('⚠️ Content generation failed. Will retry.', true);
        }
    }
    
    /**
     * Archives today's content during Night Module (6 PM - 8 AM)
     */
    async function archiveTodaysContent(): Promise<void> {
        const { hour, now } = getCanonicalTime();
        
        // Only archive during Night Module (6 PM - 8 AM)
        if (hour >= 8 && hour < 18) {
            console.log(`⏰ Night: Not in Night time window (current hour: ${hour})`);
            return;
        }
        
        const todayKey = new Date().toISOString().split('T')[0];
        const archiveKey = `archived-${todayKey}`;
        
        // Check if we've already archived today's content
        if (localStorage.getItem(archiveKey)) {
            console.log('🔄 Night: Content already archived for today');
            return;
        }
        
        console.log('📦 Night: Archiving today\'s content...', {
            currentTime: now.toISOString(),
            todayKey: todayKey,
            hour: hour,
            activeContentDate: activeContentDate.toISOString()
        });
        
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
            console.log('✅ Night: Content archived successfully for today');
            
        } catch (error) {
            console.error('❌ Night: Content archiving failed', error);
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

        renderTasks(tasks, 'tasks-list-day');
        
        // Day Module: Content from yesterday's Night Module preview is now active
        console.log('☀️ Day Module: Using content that was previewed in Night Module');
    }

    async function renderCrossoverModule() {
        const lifePointerEl = document.getElementById('life-pointer-display-crossover');
        if (lifePointerEl) lifePointerEl.textContent = todaysLifePointer;

        renderTasks(tasks, 'tasks-list-crossover');
        
        // CrossOver Module: Generate tomorrow's content
        await triggerCrossOverContentGeneration();
    }

    async function renderNightModule() {
        const dayOfYear = getDayOfYear(previewContentDate);
        const tomorrowsLifePointer = lifePointers[(dayOfYear - 1) % lifePointers.length];
        
        const lifePointerEl = document.getElementById('life-pointer-display-night');
        if (lifePointerEl) lifePointerEl.textContent = tomorrowsLifePointer;
        
        renderTasks(tasks, 'tasks-list-night');
        
        // Night Module: Archive today's content and show tomorrow's preview
        await archiveTodaysContent();
        console.log('🌙 Night Module: Today\'s content archived, tomorrow\'s content previewed');
    }
});