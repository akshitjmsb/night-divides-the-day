import { supabase } from '../lib/supabase';
import { Task, ChatMessage, PoetrySelection } from '../types';

// --- Task Persistence ---

export async function loadTasks(userId: string): Promise<Task[]> {
    try {
        const { data, error } = await supabase
            .from('tasks')
            .select('text, completed')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error loading tasks from Supabase:', error);
            return [];
        }

        if (!data) {
            return [];
        }

        return data.map(task => ({
            text: task.text,
            completed: task.completed
        })) as Task[];
    } catch (error) {
        console.error('Error loading tasks:', error);
        return [];
    }
}

export async function saveTasks(userId: string, tasks: Task[]): Promise<void> {
    try {
        // Delete all existing tasks for this user
        const { error: deleteError } = await supabase
            .from('tasks')
            .delete()
            .eq('user_id', userId);

        if (deleteError) {
            console.error('Error deleting existing tasks:', deleteError);
        }

        // Insert all tasks
        if (tasks.length > 0) {
            const tasksToInsert = tasks.map(task => ({
                user_id: userId,
                text: task.text,
                completed: task.completed
            }));

            const { error: insertError } = await supabase
                .from('tasks')
                .insert(tasksToInsert);

            if (insertError) {
                console.error('Error saving tasks to Supabase:', insertError);
                throw insertError;
            }
        }
    } catch (error) {
        console.error('Error saving tasks:', error);
        throw error;
    }
}

// --- Chat History Persistence ---

export async function loadChatHistory(userId: string): Promise<ChatMessage[]> {
    try {
        const { data, error } = await supabase
            .from('chat_history')
            .select('role, text')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error loading chat history from Supabase:', error);
            return [];
        }

        if (!data) {
            return [];
        }

        return data.map(msg => ({
            role: msg.role as 'user' | 'model',
            text: msg.text
        })) as ChatMessage[];
    } catch (error) {
        console.error('Error loading chat history:', error);
        return [];
    }
}

export async function saveChatHistory(userId: string, messages: ChatMessage[]): Promise<void> {
    try {
        // Delete all existing chat history for this user
        const { error: deleteError } = await supabase
            .from('chat_history')
            .delete()
            .eq('user_id', userId);

        if (deleteError) {
            console.error('Error deleting existing chat history:', deleteError);
        }

        // Insert all messages
        if (messages.length > 0) {
            const messagesToInsert = messages.map(msg => ({
                user_id: userId,
                role: msg.role,
                text: msg.text
            }));

            const { error: insertError } = await supabase
                .from('chat_history')
                .insert(messagesToInsert);

            if (insertError) {
                console.error('Error saving chat history to Supabase:', insertError);
                throw insertError;
            }
        }
    } catch (error) {
        console.error('Error saving chat history:', error);
        throw error;
    }
}

// --- Poetry Recents Persistence ---

const MAX_POETRY_RECENTS = 6;

export async function loadPoetryRecents(userId: string): Promise<PoetrySelection[]> {
    try {
        const { data, error } = await supabase
            .from('poetry_recents')
            .select('poet, language, timestamp')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .limit(MAX_POETRY_RECENTS);

        if (error) {
            console.error('Error loading poetry recents from Supabase:', error);
            return [];
        }

        if (!data) {
            return [];
        }

        return data.map(item => ({
            poet: item.poet,
            language: item.language,
            timestamp: item.timestamp
        })) as PoetrySelection[];
    } catch (error) {
        console.error('Error loading poetry recents:', error);
        return [];
    }
}

export async function savePoetryRecents(userId: string, recents: PoetrySelection[]): Promise<void> {
    try {
        // Delete all existing poetry recents for this user
        const { error: deleteError } = await supabase
            .from('poetry_recents')
            .delete()
            .eq('user_id', userId);

        if (deleteError) {
            console.error('Error deleting existing poetry recents:', deleteError);
        }

        // Insert all recents (already deduplicated and capped by recordPoetrySelection)
        if (recents.length > 0) {
            const recentsToInsert = recents.map(recent => ({
                user_id: userId,
                poet: recent.poet,
                language: recent.language,
                timestamp: recent.timestamp
            }));

            const { error: insertError } = await supabase
                .from('poetry_recents')
                .insert(recentsToInsert);

            if (insertError) {
                console.error('Error saving poetry recents to Supabase:', insertError);
                throw insertError;
            }
        }
    } catch (error) {
        console.error('Error saving poetry recents:', error);
        throw error;
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

// --- Guitar Recent Picks Persistence ---

export async function loadGuitarRecentPicks(userId: string): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('guitar_recent_picks')
            .select('song_title, artist')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) {
            console.error('Error loading guitar recent picks from Supabase:', error);
            return [];
        }

        if (!data) {
            return [];
        }

        return data.map(item => `${item.song_title} — ${item.artist}`);
    } catch (error) {
        console.error('Error loading guitar recent picks:', error);
        return [];
    }
}

export async function saveGuitarRecentPick(userId: string, songTitle: string, artist: string): Promise<void> {
    try {
        // Insert new pick
        const { error: insertError } = await supabase
            .from('guitar_recent_picks')
            .insert({
                user_id: userId,
                song_title: songTitle,
                artist: artist
            });

        if (insertError) {
            console.error('Error saving guitar recent pick:', insertError);
            throw insertError;
        }

        // Clean up old picks (keep only last 30)
        const { data: allPicks } = await supabase
            .from('guitar_recent_picks')
            .select('id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (allPicks && allPicks.length > 30) {
            const picksToDelete = allPicks.slice(30);
            const idsToDelete = picksToDelete.map(p => p.id);
            
            await supabase
                .from('guitar_recent_picks')
                .delete()
                .in('id', idsToDelete);
        }
    } catch (error) {
        console.error('Error saving guitar recent pick:', error);
        throw error;
    }
}

