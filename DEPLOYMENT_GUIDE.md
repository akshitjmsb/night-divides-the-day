# 🚀 Night Divides the Day - Vercel Deployment Guide

This guide will help you deploy your "Night Divides the Day" application to Vercel successfully.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Gemini API Key**: Get one from [Google AI Studio](https://makersuite.google.com/app/apikey)

## 🔧 Step 1: Environment Variables Setup

### In Vercel Dashboard:

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

**Important Notes:**
- Replace `your_actual_gemini_api_key_here` with your real Gemini API key
- Make sure to add this to **Production**, **Preview**, and **Development** environments
- The API key should start with something like `AIza...`

## 🗄️ Step 2: Vercel KV Database Setup

1. In your Vercel project dashboard, go to **Storage** tab
2. Click **Create Database** → **KV**
3. Choose a name (e.g., `night-divides-the-day-kv`)
4. Select a region close to your users
5. Click **Create**

The KV environment variables will be automatically added to your project:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

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
2. **Check the console** for any errors
3. **Test the chat functionality** (requires Gemini API key)
4. **Test content generation** by clicking on different modules
5. **Verify the cron job** is working (runs daily at 10 PM EST)

## 🐛 Troubleshooting

### Common Issues:

#### 1. "Missing GEMINI_API_KEY" Error
- **Solution**: Double-check your environment variables in Vercel dashboard
- **Verify**: The variable name is exactly `GEMINI_API_KEY`
- **Check**: It's enabled for all environments (Production, Preview, Development)

#### 2. KV Database Connection Issues
- **Solution**: Ensure Vercel KV is properly connected to your project
- **Check**: Go to Storage tab in Vercel dashboard
- **Verify**: The database is created and active

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
3. **KV Usage**: Check storage usage in Vercel dashboard

## 🔄 Cron Job Configuration

The app has a cron job configured to run daily at 10 PM EST:
- **Schedule**: `0 22 * * *` (in vercel.json)
- **Endpoint**: `/api/run-cycle`
- **Purpose**: Generates daily content automatically

## 🎯 Success Indicators

Your deployment is successful when:
- ✅ App loads without errors
- ✅ Chat functionality works
- ✅ Content generation works
- ✅ API endpoints respond correctly
- ✅ Cron job runs automatically
- ✅ KV storage is working

## 📞 Support

If you encounter issues:
1. Check the Vercel function logs
2. Verify environment variables
3. Test API endpoints individually
4. Check the browser console for client-side errors

---

**Happy Deploying! 🎉**

Your "Night Divides the Day" app should now be live and fully functional on Vercel.
