import { Task } from "../types";
import { saveTasks as saveTasksToSupabase, loadTasks as loadTasksFromSupabase } from "../core/supabase-persistence";
import { escapeHtml, sanitizeTaskInput, createSafeHtml } from "../utils/escapeHtml";
import { DEFAULT_USER_ID } from "../core/default-user";

export function renderTasks(tasks: Task[], listId: string) {
    const listEl = document.getElementById(listId);
    if(!listEl) return;
    
    if (tasks.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 2rem; font-style: italic;">No tasks yet. Add one above to get started!</p>';
        return;
    }
    
    listEl.innerHTML = `
        <div class="tasks-header">
            <span class="tasks-count">${tasks.length} task${tasks.length !== 1 ? 's' : ''}</span>
            <div class="sync-controls">
                <button class="refresh-btn" id="refresh-btn-${listId}" title="Refresh from cloud">🔄</button>
                <span class="sync-indicator" id="sync-indicator-${listId}">🔄</span>
            </div>
        </div>
        ${tasks.map((task, index) => `
            <div class="task-item">
                <input type="checkbox" data-index="${index}" ${task.completed ? 'checked' : ''}>
                <label class="${task.completed ? 'completed' : ''}">${createSafeHtml(task.text, { maxLength: 200 })}</label>
                <button class="delete-btn" data-index="${index}" title="Delete task">&times;</button>
            </div>
        `).join('')}
    `;
    
    // Note: Event listeners are attached separately with userId
}

async function handleTaskSubmit(e: Event, userId: string, mainRender: () => Promise<void>) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.querySelector('input[type="text"]') as HTMLInputElement;
    if (!input) return;

    const taskText = input.value.trim();
    if (!taskText) return;

    const sanitizedText = sanitizeTaskInput(taskText);

    if (sanitizedText) {
        // Load current tasks from Supabase to ensure we have the latest
        const currentTasks = await loadTasksFromSupabase(userId);
        currentTasks.push({ text: sanitizedText, completed: false });
        input.value = '';
        
        try {
            await saveTasksToSupabase(userId, currentTasks);
            // Re-render to show the new task
            await mainRender();
        } catch (error) {
            console.error('Error saving task:', error);
            const statusEl = document.getElementById('sync-status');
            if (statusEl) {
                statusEl.innerHTML = '⚠️ Error saving task. Please try again.';
                statusEl.classList.remove('hidden');
                setTimeout(() => {
                    statusEl.classList.add('hidden');
                }, 3000);
            }
        }
    } else {
        // Show user feedback for invalid input
        console.warn('Task input was rejected due to security concerns');
        input.value = ''; // Clear the input
    }
}

export function handleTaskDelete(target: HTMLElement, tasks: Task[], userId: string, mainRender: () => void) {
    const index = parseInt(target.dataset.index || '-1');
    if (index > -1) {
        tasks.splice(index, 1);
        saveTasksToSupabase(userId, tasks).then(() => {
            mainRender();
        }).catch(error => {
            console.error('Error deleting task:', error);
        });
    }
}

export function handleTaskToggle(target: HTMLInputElement, tasks: Task[], userId: string, mainRender: () => void) {
    const index = parseInt(target.dataset.index || '-1');
    if (index > -1) {
        tasks[index].completed = !tasks[index].completed;
        saveTasksToSupabase(userId, tasks).then(() => {
            mainRender();
        }).catch(error => {
            console.error('Error toggling task:', error);
        });
    }
}

function attachTaskEventListeners(listId: string, userId: string) {
    const listEl = document.getElementById(listId);
    if (!listEl) return;

    // Add click listener for delete buttons
    listEl.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('delete-btn')) {
            const index = parseInt(target.dataset.index || '-1');
            if (index > -1) {
                // Get tasks from centralized storage
                const tasks = await loadTasksFromSupabase(userId);
                tasks.splice(index, 1);
                await saveTasksToSupabase(userId, tasks);
                // Re-render the tasks
                renderTasks(tasks, listId);
            }
        }
    });

    // Add change listener for checkboxes
    listEl.addEventListener('change', async (e) => {
        const target = e.target as HTMLInputElement;
        if (target.type === 'checkbox') {
            const index = parseInt(target.dataset.index || '-1');
            if (index > -1) {
                // Get tasks from centralized storage
                const tasks = await loadTasksFromSupabase(userId);
                tasks[index].completed = target.checked;
                await saveTasksToSupabase(userId, tasks);
                // Re-render the tasks
                renderTasks(tasks, listId);
            }
        }
    });
}

export function initializeTaskForms(userId: string, mainRender: () => Promise<void>) {
    // Initialize form submission handlers
    document.getElementById('add-task-form-day')?.addEventListener('submit', (e) => handleTaskSubmit(e, userId, mainRender));
    document.getElementById('add-task-form-night')?.addEventListener('submit', (e) => handleTaskSubmit(e, userId, mainRender));
}

export function attachTaskListeners(listId: string, userId: string) {
    attachTaskEventListeners(listId, userId);
    
    // Add refresh button listener
    const refreshBtn = document.getElementById(`refresh-btn-${listId}`);
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => refreshTasksFromCloud(listId, userId));
    }
}

// Function to show sync status
export function showSyncStatus(listId: string, isSyncing: boolean = true) {
    const indicator = document.getElementById(`sync-indicator-${listId}`);
    if (indicator) {
        if (isSyncing) {
            indicator.textContent = '🔄';
            indicator.classList.add('syncing');
        } else {
            indicator.textContent = '✅';
            indicator.classList.remove('syncing');
            // Reset to default after 2 seconds
            setTimeout(() => {
                indicator.textContent = '🔄';
            }, 2000);
        }
    }
}

// Function to refresh tasks from cloud storage
export async function refreshTasksFromCloud(listId: string, userId: string) {
    try {
        showSyncStatus(listId, true);
        const tasks = await loadTasksFromSupabase(userId);
        renderTasks(tasks, listId);
        attachTaskListeners(listId, userId);
        showSyncStatus(listId, false);
    } catch (error) {
        console.error('Failed to refresh tasks from cloud:', error);
        showSyncStatus(listId, false);
    }
}
