# ✅ Supabase Setup Complete

Your Supabase access token has been configured for CLI operations.

## Access Token

```
sbp_1f3a4cf6d81da3b010bc2bafad807932a15c150d
```

This token is already included in:
- `setup-supabase.sh` - Automated setup script
- `supabase/.env.example` - Example configuration

## Quick Start

### 1. Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Verify
supabase --version
```

### 2. Run Setup Script

```bash
# Make executable (if needed)
chmod +x setup-supabase.sh

# Run setup
./setup-supabase.sh

# Or use npm
npm run supabase:setup
```

The script will:
- ✅ Check for Supabase CLI
- ✅ Authenticate using your access token
- ✅ Link your project
- ✅ Push database migrations

### 3. Get Client Credentials

You still need the anon key for your application:

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Settings → API
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon/public key** → `VITE_SUPABASE_ANON_KEY`

### 4. Create .env File

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your_anon_key
VITE_GEMINI_API_KEY=your_gemini_key  # Optional
```

### 5. Start Development

```bash
npm install
npm run dev
```

## Available NPM Scripts

```bash
npm run supabase:setup    # Run full setup with access token
npm run supabase:push     # Push migrations to remote
npm run supabase:start    # Start local Supabase
npm run supabase:stop     # Stop local Supabase
npm run supabase:types    # Generate TypeScript types
```

## Manual CLI Usage

If you prefer manual commands:

```bash
# Set access token
export SUPABASE_ACCESS_TOKEN="sbp_1f3a4cf6d81da3b010bc2bafad807932a15c150d"

# Login
supabase login --token "$SUPABASE_ACCESS_TOKEN"

# Link project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## Documentation

- [ACCESS_TOKEN_SETUP.md](./ACCESS_TOKEN_SETUP.md) - Detailed access token guide
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Complete Supabase setup
- [QUICK_START.md](./QUICK_START.md) - Quick reference
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Vercel deployment

## Security Notes

✅ Access token is in `.gitignore`  
✅ Never commit tokens to git  
✅ Use environment variables  
✅ Rotate token if exposed  

The access token is for CLI/API operations only. Your application uses the anon key for client-side code.

