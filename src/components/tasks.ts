import { Task } from "../types";
import { saveTasks } from "../core/persistence";
import { escapeHtml, sanitizeTaskInput, createSafeHtml } from "../utils/escapeHtml";

export function renderTasks(tasks: Task[], listId: string) {
    const listEl = document.getElementById(listId);
    if(!listEl) return;
    
    if (tasks.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <p class="empty-text">No tasks yet. Add one above!</p>
            </div>
        `;
        return;
    }
    
    listEl.innerHTML = tasks.map((task, index) => `
        <div class="task-item">
            <input type="checkbox" data-index="${index}" ${task.completed ? 'checked' : ''}>
            <label class="${task.completed ? 'completed' : ''}">${createSafeHtml(task.text, { maxLength: 200 })}</label>
            <button class="delete-btn" data-index="${index}" title="Delete task">&times;</button>
        </div>
    `).join('');
    
    // Attach event listeners to the newly rendered elements
    attachTaskEventListeners(listId);
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
    listEl.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('delete-btn')) {
            const index = parseInt(target.dataset.index || '-1');
            if (index > -1) {
                // Get tasks from the global state (we'll need to pass this)
                const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                tasks.splice(index, 1);
                localStorage.setItem('tasks', JSON.stringify(tasks));
                // Re-render the tasks
                renderTasks(tasks, listId);
            }
        }
    });

    // Add change listener for checkboxes
    listEl.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.type === 'checkbox') {
            const index = parseInt(target.dataset.index || '-1');
            if (index > -1) {
                // Get tasks from the global state
                const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                tasks[index].completed = target.checked;
                localStorage.setItem('tasks', JSON.stringify(tasks));
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
