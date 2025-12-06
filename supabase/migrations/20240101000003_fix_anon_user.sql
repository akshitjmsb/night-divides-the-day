-- Fix for Anonymous User Constraint
-- Inserts the hardcoded anonymous user ID into auth.users so that foreign keys in generation_flags work.

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'anon@nightdividestyheday.app', 
    '', -- no password
    now(), -- confirmed
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    'authenticated',
    'authenticated'
)
ON CONFLICT (id) DO NOTHING;
