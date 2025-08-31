import { Task, ChatMessage, PoetrySelection } from '../types';

const CLOUD_CACHE_BASE_URL = 'https://kvdb.io/akki-boy-dashboard-cache';

// --- Task Persistence ---

export async function loadTasks(): Promise<Task[]> {
    const cloudKey = 'persistent-tasks-list';
    let tasks: Task[] = [];

    // 1. Try to fetch from cloud first
    try {
        const response = await fetch(`${CLOUD_CACHE_BASE_URL}/${cloudKey}`);
        if (response.ok) {
            const responseText = await response.text();
            if (responseText) {
                try {
                    const cloudData = JSON.parse(responseText);
                    if (cloudData && Array.isArray(cloudData.tasks)) {
                        console.log("Successfully loaded tasks from cloud cache.");
                        tasks = cloudData.tasks.filter((t: any): t is Task =>
                            typeof t === 'object' && t !== null && 'text' in t && 'completed' in t
                        );
                        localStorage.setItem('persistentTasks', JSON.stringify(tasks)); // Sync back to local
                        return tasks;
                    }
                } catch (jsonError) {
                     console.warn("Failed to parse tasks from cloud cache.", jsonError);
                }
            }
        }
    } catch (e) {
        console.warn("Could not fetch tasks from cloud. Falling back to local storage.", e);
    }

    // 2. Fallback to local storage
    console.log("Loading tasks from local storage.");
    const storedTasksRaw = localStorage.getItem('persistentTasks');
    if (!storedTasksRaw) {
        return [];
    }
    try {
        const parsedTasks = JSON.parse(storedTasksRaw);
        if (Array.isArray(parsedTasks)) {
            return parsedTasks.filter((t: any): t is Task =>
                typeof t === 'object' && t !== null && 'text' in t && 'completed' in t
            );
        }
    } catch (error) {
        console.error("Error parsing tasks from localStorage.", error);
    }
    return [];
}

export async function saveTasks(tasks: Task[]): Promise<void> {
    // 1. Save to local storage immediately
    localStorage.setItem('persistentTasks', JSON.stringify(tasks));

    // 2. Asynchronously save to cloud
    const cloudKey = 'persistent-tasks-list';
    try {
        const response = await fetch(`${CLOUD_CACHE_BASE_URL}/${cloudKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tasks: tasks }),
        });
        if (!response.ok) {
             console.error(`Failed to save tasks to cloud. Status: ${response.status}`);
        } else {
            console.log("Tasks saved to cloud cache.");
        }
    } catch (e) {
        console.error("Error saving tasks to cloud cache. They are still saved locally.", e);
    }
}


// --- Chat History Persistence ---

export async function loadChatHistory(): Promise<ChatMessage[]> {
    const cloudKey = 'persistent-main-chat-history';
    let mainChatHistory: ChatMessage[] = [];

    // 1. Try cloud first
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
                    return mainChatHistory;
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
                return parsedHistory;
            }
        } catch (error) {
            console.error("Error parsing chat history from localStorage.", error);
        }
    }
    return [];
}

export async function saveChatHistory(mainChatHistory: ChatMessage[]): Promise<void> {
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


// --- Poetry Recents Persistence ---

const POETRY_RECENTS_LOCAL_KEY = 'poetryRecents';
const POETRY_RECENTS_CLOUD_KEY = 'poetry-recent-selections';
const MAX_POETRY_RECENTS = 6;

export async function loadPoetryRecents(): Promise<PoetrySelection[]> {
    // 1) Try cloud first
    try {
        const res = await fetch(`${CLOUD_CACHE_BASE_URL}/${POETRY_RECENTS_CLOUD_KEY}`);
        if (res.ok) {
            const text = await res.text();
            if (text) {
                const parsed = JSON.parse(text);
                const recents = (Array.isArray(parsed) ? parsed : parsed?.recents) || [];
                if (Array.isArray(recents)) {
                    localStorage.setItem(POETRY_RECENTS_LOCAL_KEY, JSON.stringify(recents));
                    return recents as PoetrySelection[];
                }
            }
        }
    } catch (e) {
        console.warn('Could not load poetry recents from cloud, falling back to local.', e);
    }

    // 2) Local fallback
    try {
        const local = localStorage.getItem(POETRY_RECENTS_LOCAL_KEY);
        if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed)) return parsed as PoetrySelection[];
        }
    } catch (e) {
        console.warn('Could not parse local poetry recents.', e);
    }
    return [];
}

export async function savePoetryRecents(recents: PoetrySelection[]): Promise<void> {
    try {
        localStorage.setItem(POETRY_RECENTS_LOCAL_KEY, JSON.stringify(recents));
    } catch (e) {
        console.warn('Failed saving poetry recents to local storage.', e);
    }
    try {
        await fetch(`${CLOUD_CACHE_BASE_URL}/${POETRY_RECENTS_CLOUD_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recents })
        });
    } catch (e) {
        console.warn('Failed saving poetry recents to cloud cache.', e);
    }
}

export function recordPoetrySelection(recents: PoetrySelection[], poet: string, language: string): PoetrySelection[] {
    const next: PoetrySelection[] = [{ poet, language, timestamp: Date.now() }, ...recents];
    // Deduplicate consecutive duplicates and cap size
    const unique: PoetrySelection[] = [];
    for (const item of next) {
        const last = unique[unique.length - 1];
        if (!last || last.poet !== item.poet || last.language !== item.language) {
            unique.push(item);
        }
        if (unique.length >= MAX_POETRY_RECENTS) break;
    }
    return unique;
}
