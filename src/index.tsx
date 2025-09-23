import { GenerateContentResponse, Type } from "@google/genai";

import { escapeHtml } from "./utils/escapeHtml";
import { getDayOfYear } from "./utils/date";
import { getCanonicalTime, isContentReadyForPreview, isDayMode, isNightMode } from "./core/time";
import { Task, PoetrySelection } from "./types";
import { loadTasks, saveTasks, loadPoetryRecents, savePoetryRecents, recordPoetrySelection } from "./core/persistence";
import { initializeQuantumTimer } from "./components/quantumTimer";
import { initializeTaskForms, renderTasks, handleTaskDelete, handleTaskToggle, refreshTasksFromCloud } from "./components/tasks";
import { getOrGenerateDynamicContent, getOrGeneratePlanForDate, ai } from "./api/gemini";
import { initializeModalManager } from "./components/modals/modalManager";
import { renderModuleIcons } from "./utils/iconRenderer";
import { getPhilosophicalQuoteInstant, generateAIPhilosophicalQuote, getReflectionPrompt, showQuoteLoadingIndicator, hideQuoteLoadingIndicator } from "./components/reflection";

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE & DERIVED DATA ---
    let todayKey: string, tomorrowKey: string, tomorrowDay: number;
    let activeContentDate: Date, previewContentDate: Date;
    let todaysQuote: { quote: string; author: string } | null = null;
    let isAutoGenerating = false;
    let lastApiCall = 0;
    const API_RATE_LIMIT = 1000; // 1 second between calls

    async function updateDateDerivedData() {
        const { now, hour } = getCanonicalTime();

        // Determine the active content date based on the time.
        // From midnight to 5:59 AM, the "active day" is still considered the previous calendar day.
        if (hour < 6) {
            activeContentDate = new Date(now);
            activeContentDate.setDate(now.getDate() - 1);
        } else {
            activeContentDate = new Date(now);
        }

        // The preview date is always the day after the active content date.
        previewContentDate = new Date(activeContentDate);
        previewContentDate.setDate(activeContentDate.getDate() + 1);

        // Derive keys and other data from these canonical dates.
        todayKey = activeContentDate.toISOString().split('T')[0];
        tomorrowKey = previewContentDate.toISOString().split('T')[0];
        tomorrowDay = previewContentDate.getDay();
        
        // Load philosophical quote instantly (no API call blocking)
        todaysQuote = getPhilosophicalQuoteInstant(activeContentDate);
        
        // Optionally generate AI quote in background for future use
        if (ai) {
            // Show loading indicator
            showQuoteLoadingIndicator();
            
            generateAIPhilosophicalQuote(activeContentDate).then(aiQuote => {
                // Hide loading indicator
                hideQuoteLoadingIndicator();
                
                // Update the quote if AI generation was successful
                if (aiQuote && aiQuote.quote !== todaysQuote?.quote) {
                    todaysQuote = aiQuote;
                    // Re-render the quote display
                    const lifePointerEl = document.getElementById('life-pointer-display-day');
                    if (lifePointerEl) {
                        lifePointerEl.innerHTML = `
                            <div class="quote-text">"${aiQuote.quote}"</div>
                            <div class="quote-author">— ${aiQuote.author}</div>
                        `;
                    }
                }
            }).catch(error => {
                // Hide loading indicator on error
                hideQuoteLoadingIndicator();
                console.log("Background AI quote generation failed, using curated quote:", error);
            });
        }
    }
    
    let tasks: { text: string; completed: boolean }[] = [];

    // Active chat state for the modal UI
    // Chat functionality removed for simplicity

    // Chat functionality removed for simplicity


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
     * Proactively generates the next day's content during Night mode.
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

        // Check if we are in Night mode to generate tomorrow's content
        if (!isNightMode()) {
            return; // Not time to generate yet.
        }

        // This key prevents re-triggering the generation process every 5 minutes during Night mode.
        const generationAttemptedKey = `auto-generation-attempted-${dateKeyForGeneration}`;
        if (localStorage.getItem(generationAttemptedKey)) {
            return; // We've already run auto-generation for this date.
        }

        isAutoGenerating = true;
        showSyncStatus('⚙️ Synchronizing next day\'s content...');
        console.log(`It's Night mode. Triggering background content generation for ${dateKeyForGeneration}...`);
        
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
    
    // renderChatHistory function removed for simplicity
    
    
    async function mainRender() {
        // Recalculate time-sensitive variables each time render is called
        await updateDateDerivedData(); 
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
        
        if (isDayMode()) {
            iconEl.textContent = '☀️';
            iconEl.className = 'theme-icon day-mode';
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
            // Render icons immediately for better UX
            renderModuleIcons();
            
            await updateDateDerivedData(); // Ensure date-derived data is available
            initializeQuantumTimer();

            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                const modalDependencies = {
                    dates: {
                        active: activeContentDate,
                        preview: previewContentDate,
                    },
                    keys: {
                        today: todayKey,
                        tomorrow: tomorrowKey,
                    },
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
            // Chat functionality removed for simplicity
            
            await mainRender();

            setInterval(updateTime, 1000);
            setInterval(async () => {
                try {
                    await mainRender();
                } catch (error) {
                    handleGlobalError(error as Error, 'periodic update');
                }
            }, 60000 * 5); // every 5 minutes
            
            // More frequent task syncing for better cross-device experience
            setInterval(async () => {
                try {
                    await refreshTasksFromCloud('tasks-list-day');
                } catch (error) {
                    console.warn('Failed to sync tasks:', error);
                }
            }, 30000); // every 30 seconds
        } catch (error) {
            handleGlobalError(error as Error, 'app initialization');
        }
    }

    initializeApp();
    
    // --- MODULE EDITING FUNCTIONALITY REMOVED ---
    // All edit module names functionality has been removed for cleaner design

    // --- ENHANCED CONTENT FLOW SYSTEM ---
    
    /**
     * Enhanced content generation specifically for Night Mode (6 PM - 6 AM)
     */
    async function triggerNightContentGeneration(): Promise<void> {
        const { hour, now } = getCanonicalTime();
        
        // Only generate during Night Mode (6 PM - 6 AM)
        if (!isNightMode()) {
            console.log(`⏰ Night: Not in Night time window (current hour: ${hour})`);
            return;
        }
        
        const todayKey = new Date().toISOString().split('T')[0];
        const generationKey = `night-generation-${todayKey}`;
        
        // Check if we've already generated content for tomorrow today
        if (localStorage.getItem(generationKey)) {
            console.log('🔄 Night: Content already generated for tomorrow');
            return;
        }
        
        console.log('🚀 Night: Starting content generation for tomorrow...', {
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
            console.log('✅ Night: Content generation completed for tomorrow');
            showSyncStatus('✅ Tomorrow\'s content generated successfully!', true);
            
        } catch (error) {
            console.error('❌ Night: Content generation failed', error);
            showSyncStatus('⚠️ Content generation failed. Will retry.', true);
        }
    }
    
    /**
     * Archives today's content during Day Mode (6 AM - 6 PM)
     */
    async function archiveTodaysContent(): Promise<void> {
        const { hour, now } = getCanonicalTime();
        
        // Only archive during Day Mode (6 AM - 6 PM)
        if (!isDayMode()) {
            console.log(`⏰ Day: Not in Day time window (current hour: ${hour})`);
            return;
        }
        
        const todayKey = new Date().toISOString().split('T')[0];
        const archiveKey = `archived-${todayKey}`;
        
        // Check if we've already archived today's content
        if (localStorage.getItem(archiveKey)) {
            console.log('🔄 Day: Content already archived for today');
            return;
        }
        
        console.log('📦 Day: Archiving today\'s content...', {
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
            console.log('✅ Day: Content archived successfully for today');
            
        } catch (error) {
            console.error('❌ Day: Content archiving failed', error);
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
        // Display philosophical quote
        const lifePointerEl = document.getElementById('life-pointer-display-day');
        if (lifePointerEl && todaysQuote) {
            lifePointerEl.innerHTML = `
                <div class="quote-text">"${todaysQuote.quote}"</div>
                <div class="quote-author">— ${todaysQuote.author}</div>
            `;
        }
        
        const reflectionPromptEl = document.getElementById('reflection-prompt-display-day');
        if (reflectionPromptEl) reflectionPromptEl.textContent = '';

        renderTasks(tasks, 'tasks-list-day');
        
        if (isDayMode()) {
            // Day Mode: Use today's content
            console.log('☀️ Day Mode: Using today\'s content');
        } else {
            // Night Mode: Generate tomorrow's content and show preview
            await triggerNightContentGeneration();
            console.log('🌙 Night Mode: Generating tomorrow\'s content, showing preview');
        }
    }
});