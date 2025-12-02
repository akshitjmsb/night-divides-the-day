-- Disable authentication requirements for anonymous access
-- This allows the app to work without user authentication

-- Update RLS policies to allow anonymous access using a default user ID
-- The default user ID is: 00000000-0000-0000-0000-000000000000

-- Drop existing user-specific policies
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

DROP POLICY IF EXISTS "Users can view own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can insert own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can update own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can delete own chat history" ON chat_history;

DROP POLICY IF EXISTS "Users can view own poetry recents" ON poetry_recents;
DROP POLICY IF EXISTS "Users can insert own poetry recents" ON poetry_recents;
DROP POLICY IF EXISTS "Users can update own poetry recents" ON poetry_recents;
DROP POLICY IF EXISTS "Users can delete own poetry recents" ON poetry_recents;

DROP POLICY IF EXISTS "Users can view own content cache" ON content_cache;
DROP POLICY IF EXISTS "Users can insert own content cache" ON content_cache;
DROP POLICY IF EXISTS "Users can update own content cache" ON content_cache;
DROP POLICY IF EXISTS "Users can delete own content cache" ON content_cache;

DROP POLICY IF EXISTS "Users can view own generation flags" ON generation_flags;
DROP POLICY IF EXISTS "Users can insert own generation flags" ON generation_flags;
DROP POLICY IF EXISTS "Users can update own generation flags" ON generation_flags;
DROP POLICY IF EXISTS "Users can delete own generation flags" ON generation_flags;

DROP POLICY IF EXISTS "Users can view own guitar picks" ON guitar_recent_picks;
DROP POLICY IF EXISTS "Users can insert own guitar picks" ON guitar_recent_picks;
DROP POLICY IF EXISTS "Users can update own guitar picks" ON guitar_recent_picks;
DROP POLICY IF EXISTS "Users can delete own guitar picks" ON guitar_recent_picks;

-- Create new policies that allow access for the default anonymous user
-- These policies allow full access when user_id matches the default anonymous user ID

CREATE POLICY "Anonymous user can manage tasks" ON tasks
    FOR ALL USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Anonymous user can manage chat history" ON chat_history
    FOR ALL USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Anonymous user can manage poetry recents" ON poetry_recents
    FOR ALL USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Anonymous user can manage content cache" ON content_cache
    FOR ALL USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Anonymous user can manage generation flags" ON generation_flags
    FOR ALL USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Anonymous user can manage guitar picks" ON guitar_recent_picks
    FOR ALL USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
    WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

