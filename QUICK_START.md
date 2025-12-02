# Quick Start Guide

Get up and running with Night Divides the Day in 5 minutes.

## 1. Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Verify
supabase --version
```

## 2. Login to Supabase

```bash
# Option A: Using access token (faster)
export SUPABASE_ACCESS_TOKEN="sbp_1f3a4cf6d81da3b010bc2bafad807932a15c150d"
supabase login --token "$SUPABASE_ACCESS_TOKEN"

# Option B: Interactive login
supabase login

# Or use the setup script
./setup-supabase.sh
```

## 3. Create and Link Project

```bash
# Option A: Create new project
supabase projects create night-divides-the-day --org-id your-org-id --region us-east-1 --db-password your-secure-password
supabase link --project-ref your-project-ref

# Option B: Link existing project
supabase link --project-ref your-existing-project-ref
```

## 4. Run Migrations

```bash
supabase db push
```

This creates all database tables, indexes, and security policies.

## 5. Get Credentials

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - Project URL
   - anon/public key

## 6. Set Environment Variables

Create `.env` file:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GEMINI_API_KEY=AIza...  # Optional
```

## 7. Install Dependencies & Run

```bash
npm install
npm run dev
```

## 8. Open App

Navigate to `http://localhost:5173` and sign up!

---

**That's it!** Your app is now running with Supabase backend.

For detailed instructions, see:
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Complete Supabase setup
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deploy to Vercel

