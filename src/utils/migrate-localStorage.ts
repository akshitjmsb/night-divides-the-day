import { 
    loadTasks as loadTasksFromLocal, 
    loadChatHistory as loadChatHistoryFromLocal, 
    loadPoetryRecents as loadPoetryRecentsFromLocal 
} from '../core/persistence';
import { 
    saveTasks, 
    saveChatHistory, 
    savePoetryRecents 
} from '../core/supabase-persistence';
import { saveCachedContent, saveFoodPlan } from '../core/supabase-content-cache';

const MIGRATION_FLAG_KEY = 'localStorage-migrated-to-supabase';

/**
 * Check if migration has already been completed
 */
export function isMigrationComplete(): boolean {
    return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
}

/**
 * Mark migration as complete
 */
function markMigrationComplete(): void {
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
}

/**
 * Migrate all localStorage data to Supabase
 * This should be called once after user authentication
 */
export async function migrateLocalStorageToSupabase(userId: string): Promise<void> {
    if (isMigrationComplete()) {
        console.log('Migration already completed, skipping...');
        return;
    }

    console.log('Starting localStorage migration to Supabase...');

    try {
        // 1. Migrate tasks
        try {
            const tasks = await loadTasksFromLocal();
            if (tasks.length > 0) {
                await saveTasks(userId, tasks);
                console.log(`Migrated ${tasks.length} tasks to Supabase`);
            }
        } catch (error) {
            console.error('Error migrating tasks:', error);
        }

        // 2. Migrate chat history
        try {
            const chatHistory = await loadChatHistoryFromLocal();
            if (chatHistory.length > 0) {
                await saveChatHistory(userId, chatHistory);
                console.log(`Migrated ${chatHistory.length} chat messages to Supabase`);
            }
        } catch (error) {
            console.error('Error migrating chat history:', error);
        }

        // 3. Migrate poetry recents
        try {
            const poetryRecents = await loadPoetryRecentsFromLocal();
            if (poetryRecents.length > 0) {
                await savePoetryRecents(userId, poetryRecents);
                console.log(`Migrated ${poetryRecents.length} poetry recents to Supabase`);
            }
        } catch (error) {
            console.error('Error migrating poetry recents:', error);
        }

        // 4. Migrate cached content (food plans, analytics, etc.)
        try {
            await migrateCachedContent(userId);
        } catch (error) {
            console.error('Error migrating cached content:', error);
        }

        // Mark migration as complete
        markMigrationComplete();
        console.log('✅ localStorage migration to Supabase completed successfully');

    } catch (error) {
        console.error('Error during localStorage migration:', error);
        throw error;
    }
}

/**
 * Migrate cached content from localStorage to Supabase
 */
async function migrateCachedContent(userId: string): Promise<void> {
    const contentTypes = [
        'food-plan',
        'analytics',
        'transportation-physics',
        'french-sound',
        'exercise-plan',
        'weekly-exercise'
    ];

    let migratedCount = 0;

    for (const contentType of contentTypes) {
        // Find all localStorage keys matching this content type
        const keys = Object.keys(localStorage);
        const matchingKeys = keys.filter(key => 
            key.startsWith(`dynamic-content-${contentType}-`) || 
            key.startsWith(`${contentType}-`)
        );

        for (const key of matchingKeys) {
            try {
                const storedValue = localStorage.getItem(key);
                if (!storedValue) continue;

                // Extract date key from localStorage key
                // Format: "dynamic-content-{type}-{date}" or "{type}-{date}"
                const dateMatch = key.match(/(\d{4}-\d{2}-\d{2})/);
                if (!dateMatch) continue;

                const dateKey = dateMatch[1];
                let content: any;

                try {
                    content = JSON.parse(storedValue);
                } catch {
                    // If it's not JSON, it might be a food plan (string)
                    if (contentType === 'food-plan') {
                        await saveFoodPlan(userId, dateKey, storedValue);
                        migratedCount++;
                        continue;
                    } else {
                        continue;
                    }
                }

                // Map localStorage content types to Supabase content types
                let supabaseContentType: 'food-plan' | 'analytics' | 'transportation-physics' | 'french-sound' | 'exercise-plan' | 'weekly-exercise';
                
                if (contentType === 'food-plan') {
                    supabaseContentType = 'food-plan';
                    if (typeof content === 'string') {
                        await saveFoodPlan(userId, dateKey, content);
                    } else if (content.plan) {
                        await saveFoodPlan(userId, dateKey, content.plan);
                    }
                } else {
                    supabaseContentType = contentType as any;
                    await saveCachedContent(userId, supabaseContentType, dateKey, content);
                }

                migratedCount++;
            } catch (error) {
                console.warn(`Error migrating content from key ${key}:`, error);
            }
        }
    }

    if (migratedCount > 0) {
        console.log(`Migrated ${migratedCount} cached content items to Supabase`);
    }
}

