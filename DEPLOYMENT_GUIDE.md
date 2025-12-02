# 🚀 Night Divides the Day - Vercel Deployment Guide

This guide will help you deploy your "Night Divides the Day" application to Vercel successfully.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Supabase Account**: Sign up at [supabase.com](https://supabase.com) (free tier available)
4. **Gemini API Key**: Get one from [Google AI Studio](https://makersuite.google.com/app/apikey)

## 🔧 Step 1: Supabase Setup

### Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase
# Or download from: https://github.com/supabase/cli/releases
```

Verify installation:
```bash
supabase --version
```

### Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

### Create and Link Project

**Option A: Create via CLI**
```bash
supabase projects create night-divides-the-day --org-id your-org-id --region us-east-1 --db-password your-secure-password
supabase link --project-ref your-project-ref
```

**Option B: Create via Dashboard**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Get your project reference ID from project settings
4. Link it:
```bash
supabase link --project-ref your-project-ref
```

### Run Database Migrations

The database schema is in `supabase/migrations/`. Apply it:

```bash
supabase db push
```

This creates all tables, indexes, RLS policies, and triggers automatically.

### Get Supabase Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

**⚠️ Important**: Use the **anon/public key** for client-side code, NOT the service_role key.

For detailed setup instructions, see `SUPABASE_SETUP.md`.

## 🔧 Step 2: Environment Variables Setup

### In Vercel Dashboard:

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
```

**Important Notes:**
- Replace `your_supabase_project_url` with your Supabase Project URL (from Step 1)
- Replace `your_supabase_anon_key` with your Supabase anon/public key (from Step 1)
- Replace `your_actual_gemini_api_key_here` with your real Gemini API key
- Make sure to add these to **Production**, **Preview**, and **Development** environments
- The Supabase anon key should start with `eyJ...`
- The Gemini API key should start with something like `AIza...`

### Local Development

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

**⚠️ Security Note**: Never commit `.env` files to git. The `.env.example` file is provided as a template.

## 🚀 Step 3: Deploy to Vercel

### Option A: Deploy from GitHub (Recommended)

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect it's a Vite project
3. The build settings should be:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# For production deployment
vercel --prod
```

## ⚙️ Step 4: Verify Deployment

After deployment, test these endpoints:

1. **Main App**: `https://your-app.vercel.app`
2. **Content API**: `https://your-app.vercel.app/api/content`
3. **Manual Trigger**: `https://your-app.vercel.app/api/manual-trigger` (POST request)
4. **Archive API**: `https://your-app.vercel.app/api/archive`

## 🔍 Step 5: Test the Application

1. **Open your deployed app** in a browser
2. **Sign up/Sign in**: You should see a login screen - create an account
3. **Check the console** for any errors
4. **Test data persistence**: Create tasks, they should sync across devices
5. **Test content generation** by clicking on different modules
6. **Verify Supabase connection**: Check Supabase dashboard → Table Editor to see data
7. **Verify the cron job** is working (runs daily at 10 PM EST)

## 🐛 Troubleshooting

### Common Issues:

#### 1. "Missing GEMINI_API_KEY" Error
- **Solution**: Double-check your environment variables in Vercel dashboard
- **Verify**: The variable name is exactly `GEMINI_API_KEY`
- **Check**: It's enabled for all environments (Production, Preview, Development)

#### 2. Supabase Connection Issues
- **Solution**: Verify your Supabase credentials are correct
- **Check**: Go to Supabase dashboard → Settings → API
- **Verify**: You're using the **anon/public key**, not the service_role key
- **Test**: Check browser console for Supabase connection errors
- **Verify Tables**: Ensure all tables are created (run `supabase-schema.sql` if not)

#### 3. Build Failures
- **Solution**: Check the build logs in Vercel dashboard
- **Common cause**: Missing dependencies or TypeScript errors
- **Fix**: Ensure all dependencies are in `package.json`

#### 4. API Endpoints Not Working
- **Solution**: Check the function logs in Vercel dashboard
- **Verify**: All API files are in the `/api` directory
- **Check**: The runtime is set to `edge` in each API file

### Debug Commands:

```bash
# Check environment variables
vercel env ls

# View function logs
vercel logs

# Test API endpoints locally
curl https://your-app.vercel.app/api/content
```

## 📊 Monitoring

1. **Vercel Analytics**: Enable in your project settings
2. **Function Logs**: Monitor API endpoint performance
3. **Supabase Dashboard**: Monitor database usage, active connections, and storage
4. **Supabase Logs**: Check authentication and database query logs

## 🔄 Cron Job Configuration

The app has a cron job configured to run daily at 10 PM EST:
- **Schedule**: `0 22 * * *` (in vercel.json)
- **Endpoint**: `/api/run-cycle`
- **Purpose**: Generates daily content automatically

## 🎯 Success Indicators

Your deployment is successful when:
- ✅ App loads without errors
- ✅ Authentication works (sign up/sign in)
- ✅ Tasks persist across page refreshes
- ✅ Content generation works
- ✅ API endpoints respond correctly
- ✅ Cron job runs automatically
- ✅ Supabase database is storing data (check Table Editor)
- ✅ Data syncs across devices when logged in with same account

## 📞 Support

If you encounter issues:
1. Check the Vercel function logs
2. Verify environment variables
3. Test API endpoints individually
4. Check the browser console for client-side errors

---

**Happy Deploying! 🎉**

Your "Night Divides the Day" app should now be live and fully functional on Vercel.
