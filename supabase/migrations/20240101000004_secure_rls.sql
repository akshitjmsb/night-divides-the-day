-- Secure RLS Policies Migration
-- This migration re-enables RLS and enforces auth.uid() checks for all user tables.

-- 1. Tasks Table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anonymous user" ON tasks;
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

CREATE POLICY "Users can manage their own tasks" ON tasks
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Chat History Table
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anonymous user" ON chat_history;
DROP POLICY IF EXISTS "Users can view their own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can insert their own chat history" ON chat_history;

CREATE POLICY "Users can manage their own chat history" ON chat_history
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Poetry Recents Table
ALTER TABLE poetry_recents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anonymous user" ON poetry_recents;
DROP POLICY IF EXISTS "Users can view their own poetry recents" ON poetry_recents;
DROP POLICY IF EXISTS "Users can insert their own poetry recents" ON poetry_recents;

CREATE POLICY "Users can manage their own poetry recents" ON poetry_recents
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Content Cache Table
ALTER TABLE content_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anonymous user" ON content_cache;
DROP POLICY IF EXISTS "Users can view their own content cache" ON content_cache;
DROP POLICY IF EXISTS "Users can insert their own content cache" ON content_cache;
DROP POLICY IF EXISTS "Users can update their own content cache" ON content_cache;

CREATE POLICY "Users can manage their own content cache" ON content_cache
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Generation Flags Table
ALTER TABLE generation_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anonymous user" ON generation_flags;
DROP POLICY IF EXISTS "Users can view their own generation flags" ON generation_flags;
DROP POLICY IF EXISTS "Users can insert their own generation flags" ON generation_flags;
DROP POLICY IF EXISTS "Users can update their own generation flags" ON generation_flags;

CREATE POLICY "Users can manage their own generation flags" ON generation_flags
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. Guitar Recent Picks Table
ALTER TABLE guitar_recent_picks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anonymous user" ON guitar_recent_picks;
DROP POLICY IF EXISTS "Users can view their own guitar picks" ON guitar_recent_picks;
DROP POLICY IF EXISTS "Users can insert their own guitar picks" ON guitar_recent_picks;

CREATE POLICY "Users can manage their own guitar picks" ON guitar_recent_picks
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
