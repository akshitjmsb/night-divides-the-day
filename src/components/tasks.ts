import { Task } from "../types";
import { saveTasks, loadTasks } from "../core/persistence";
import { escapeHtml, sanitizeTaskInput, createSafeHtml } from "../utils/escapeHtml";

export function renderTasks(tasks: Task[], listId: string) {
    const listEl = document.getElementById(listId);
    if(!listEl) return;
    
    if (tasks.length === 0) {
        listEl.innerHTML = '';
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
    
    // Attach event listeners to the newly rendered elements
    attachTaskEventListeners(listId);
    
    // Add refresh button listener
    const refreshBtn = document.getElementById(`refresh-btn-${listId}`);
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => refreshTasksFromCloud(listId));
    }
}

function handleTaskSubmit(e: Event, tasks: Task[], mainRender: () => void) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.querySelector('input[type="text"]') as HTMLInputElement;
    if (!input) return;

    const taskText = input.value.trim();
    if (!taskText) return;

    const sanitizedText = sanitizeTaskInput(taskText);

    if (sanitizedText) {
        tasks.push({ text: sanitizedText, completed: false });
        input.value = '';
        saveTasks(tasks);
        mainRender();
    } else {
        // Show user feedback for invalid input
        console.warn('Task input was rejected due to security concerns');
        input.value = ''; // Clear the input
    }
}

export function handleTaskDelete(target: HTMLElement, tasks: Task[], mainRender: () => void) {
    const index = parseInt(target.dataset.index || '-1');
    if (index > -1) {
        tasks.splice(index, 1);
        saveTasks(tasks);
        mainRender();
    }
}

export function handleTaskToggle(target: HTMLInputElement, tasks: Task[], mainRender: () => void) {
    const index = parseInt(target.dataset.index || '-1');
    if (index > -1) {
        tasks[index].completed = !tasks[index].completed;
        saveTasks(tasks);
        mainRender();
    }
}

function attachTaskEventListeners(listId: string) {
    const listEl = document.getElementById(listId);
    if (!listEl) return;

    // Add click listener for delete buttons
    listEl.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('delete-btn')) {
            const index = parseInt(target.dataset.index || '-1');
            if (index > -1) {
                // Get tasks from centralized storage
                const tasks = await loadTasks();
                tasks.splice(index, 1);
                await saveTasks(tasks);
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
                const tasks = await loadTasks();
                tasks[index].completed = target.checked;
                await saveTasks(tasks);
                // Re-render the tasks
                renderTasks(tasks, listId);
            }
        }
    });
}

export function initializeTaskForms(tasks: Task[], mainRender: () => void) {
    document.getElementById('add-task-form-day')?.addEventListener('submit', (e) => handleTaskSubmit(e, tasks, mainRender));
    document.getElementById('add-task-form-night')?.addEventListener('submit', (e) => handleTaskSubmit(e, tasks, mainRender));
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
export async function refreshTasksFromCloud(listId: string) {
    try {
        showSyncStatus(listId, true);
        const tasks = await loadTasks();
        renderTasks(tasks, listId);
        showSyncStatus(listId, false);
    } catch (error) {
        console.error('Failed to refresh tasks from cloud:', error);
        showSyncStatus(listId, false);
    }
}
