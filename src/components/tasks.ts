import { Task } from "../types";
import { saveTasks } from "../core/persistence";
import { escapeHtml } from "../utils/escapeHtml";

export function renderTasks(tasks: Task[], listId: string) {
    const listEl = document.getElementById(listId);
    if(!listEl) return;
    listEl.innerHTML = tasks.map((task, index) => `
        <div class="task-item">
            <input type="checkbox" data-index="${index}" ${task.completed ? 'checked' : ''}>
            <label class="${task.completed ? 'completed' : ''}">${escapeHtml(task.text)}</label>
            <button class="delete-btn" data-index="${index}">&times;</button>
        </div>
    `).join('');
}

function handleTaskSubmit(e: Event, tasks: Task[], mainRender: () => void) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.querySelector('input[type="text"]') as HTMLInputElement;
    if (!input) return;

    const taskText = input.value.trim();
    if (!taskText) return;

    const sanitizedText = escapeHtml(taskText).substring(0, 200);

    if (sanitizedText) {
        tasks.push({ text: sanitizedText, completed: false });
        input.value = '';
        saveTasks(tasks);
        mainRender();
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

export function initializeTaskForms(tasks: Task[], mainRender: () => void) {
    document.getElementById('add-task-form-day')?.addEventListener('submit', (e) => handleTaskSubmit(e, tasks, mainRender));
    document.getElementById('add-task-form-night')?.addEventListener('submit', (e) => handleTaskSubmit(e, tasks, mainRender));
}
