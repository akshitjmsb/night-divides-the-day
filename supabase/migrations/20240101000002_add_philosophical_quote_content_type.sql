-- Migration: Add 'philosophical-quote' to content_cache content_type CHECK constraint
-- This allows storing daily philosophical quotes generated at 5 PM

-- Drop the existing CHECK constraint
ALTER TABLE content_cache 
DROP CONSTRAINT IF EXISTS content_cache_content_type_check;

-- Add the new CHECK constraint with 'philosophical-quote' included
ALTER TABLE content_cache 
ADD CONSTRAINT content_cache_content_type_check 
CHECK (content_type IN (
    'food-plan', 
    'analytics', 
    'transportation-physics', 
    'french-sound', 
    'exercise-plan', 
    'weekly-exercise', 
    'archive',
    'classic-rock-500',
    'philosophical-quote'
));

