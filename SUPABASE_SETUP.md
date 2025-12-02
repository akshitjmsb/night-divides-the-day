# Supabase Setup Guide

This guide will help you set up Supabase for the Night Divides the Day application using the Supabase CLI.

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Supabase CLI**: Install the CLI tool
3. **Node.js**: Version 18 or higher

## Step 1: Install Supabase CLI

### macOS
```bash
brew install supabase/tap/supabase
```

### Windows
```bash
# Using Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or download from: https://github.com/supabase/cli/releases
```

### Linux
```bash
# Using Homebrew
brew install supabase/tap/supabase

# Or download from: https://github.com/supabase/cli/releases
```

### Verify Installation
```bash
supabase --version
```

## Step 2: Login to Supabase

### Option A: Using Access Token (Recommended)

If you have a Supabase access token, you can use it directly:

```bash
# Set the access token as environment variable
export SUPABASE_ACCESS_TOKEN="sbp_1f3a4cf6d81da3b010bc2bafad807932a15c150d"

# Login with token
supabase login --token "$SUPABASE_ACCESS_TOKEN"
```

Or use the provided setup script:

```bash
./setup-supabase.sh
```

### Option B: Interactive Login

```bash
supabase login
```

This will open your browser to authenticate. After successful login, you'll be able to link your project.

**Note**: The access token is for CLI/API operations. For client-side code, you'll still need the anon/public key from your Supabase Dashboard.

## Step 3: Link Your Project

### Option A: Link to Existing Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project or select an existing one
3. Get your project reference ID from the project settings
4. Link your local project:

```bash
supabase link --project-ref your-project-ref
```

### Option B: Create New Project via CLI

```bash
supabase projects create night-divides-the-day --org-id your-org-id --region us-east-1 --db-password your-secure-password
```

Then link it:
```bash
supabase link --project-ref your-project-ref
```

## Step 4: Run Migrations

The database schema is already set up in `supabase/migrations/`. To apply it:

```bash
# Push migrations to your remote Supabase project
supabase db push
```

This will:
- Create all tables (tasks, chat_history, poetry_recents, content_cache, generation_flags, guitar_recent_picks)
- Set up all indexes for performance
- Enable Row Level Security (RLS)
- Create RLS policies for user data isolation
- Set up triggers for automatic timestamp updates

## Step 5: Verify Migration

Check that all tables were created:

```bash
# List all tables
supabase db remote list
```

Or check in the Supabase Dashboard:
1. Go to your project dashboard
2. Navigate to **Table Editor**
3. You should see all 6 tables created

## Step 6: Get Your Credentials

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

**⚠️ Important**: Use the **anon/public key** for client-side code, NOT the service_role key.

## Step 7: Set Environment Variables

### Local Development

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY` (optional)

Make sure to add these to **Production**, **Preview**, and **Development** environments.

## Step 8: Local Development (Optional)

To run Supabase locally for development:

```bash
# Start local Supabase (includes database, auth, storage, etc.)
supabase start

# This will output:
# - API URL: http://localhost:54321
# - GraphQL URL: http://localhost:54321/graphql/v1
# - DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# - Studio URL: http://localhost:54323
# - Inbucket URL: http://localhost:54324
# - JWT secret: (your-jwt-secret)
# - anon key: (your-anon-key)
# - service_role key: (your-service-role-key)
```

Update your `.env` file with the local URLs and keys.

To stop local Supabase:
```bash
supabase stop
```

## Useful CLI Commands

```bash
# Check migration status
supabase migration list

# Create a new migration
supabase migration new migration_name

# Reset local database (WARNING: deletes all data)
supabase db reset

# Generate TypeScript types from your database
supabase gen types typescript --local > src/types/supabase.ts

# Pull remote database schema
supabase db pull

# Push local changes to remote
supabase db push

# View database diff
supabase db diff

# Start local development
supabase start

# Stop local development
supabase stop

# View logs
supabase logs
```

## Troubleshooting

### Migration Fails

If migrations fail, check:
1. You're linked to the correct project: `supabase projects list`
2. You have the correct permissions
3. The migration file syntax is correct

### RLS Policies Not Working

1. Verify RLS is enabled: Check in Supabase Dashboard → Table Editor → Table Settings
2. Check policies exist: `supabase db remote list` or check in Dashboard → Authentication → Policies
3. Ensure you're using the anon key, not service_role key

### Connection Issues

1. Verify your project URL and anon key are correct
2. Check that your Supabase project is active (not paused)
3. Ensure environment variables are set correctly
4. Check browser console for specific error messages

## Next Steps

After setup:
1. ✅ Database schema is created
2. ✅ RLS policies are active
3. ✅ Environment variables are set
4. ✅ Ready to deploy!

See `DEPLOYMENT_GUIDE.md` for deployment instructions.

