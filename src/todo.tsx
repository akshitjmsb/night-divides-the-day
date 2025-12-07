import { getCanonicalTime } from "./core/time";
import { loadTasks as loadTasksFromSupabase } from "./core/supabase-persistence";
import { initializeTaskForms, renderTasks, attachTaskListeners } from "./components/tasks";
import { getUserId } from "./lib/supabase";
import { Task } from "./types";

let currentUserId: string;
let tasks: Task[] = [];

// Update datetime display
function updateDateTime() {
    const { now } = getCanonicalTime();
    const datetimeEl = document.getElementById('current-datetime');
    if (datetimeEl) {
        datetimeEl.textContent = now.toLocaleString('en-CA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }
}

// Main render function
async function mainRender() {
    try {
        if (!currentUserId) return;

        // Load tasks
        tasks = await loadTasksFromSupabase(currentUserId);

        // Render tasks
        renderTasks(tasks, 'tasks-list-day');

        // Attach listeners
        attachTaskListeners('tasks-list-day', currentUserId);
    } catch (error) {
        console.error('Error in mainRender:', error);
        const statusEl = document.getElementById('sync-status');
        if (statusEl) {
            statusEl.innerHTML = '⚠️ Error loading tasks. Please refresh the page.';
            statusEl.classList.remove('hidden');
            setTimeout(() => {
                statusEl.classList.add('hidden');
            }, 5000);
        }
    }
}

// Initialize app
async function initializeApp() {
    try {
        // Authenticate
        currentUserId = await getUserId();

        // Update datetime
        updateDateTime();
        setInterval(updateDateTime, 1000);

        // Initial render
        await mainRender();

        // Initialize form (pass async mainRender function)
        initializeTaskForms(currentUserId, mainRender);

    } catch (error) {
        console.error('Error initializing app:', error);
        const statusEl = document.getElementById('sync-status');
        if (statusEl) {
            statusEl.innerHTML = '⚠️ Error initializing. Please refresh the page.';
            statusEl.classList.remove('hidden');
        }
    }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

