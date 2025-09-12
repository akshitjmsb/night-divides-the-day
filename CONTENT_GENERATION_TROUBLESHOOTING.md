# Content Generation Troubleshooting Guide

## What Happened at 5 PM Today

If content wasn't generated at 5 PM today, here are the most likely causes and solutions:

### 1. **Cron Schedule Time Zone Issue** ✅ FIXED
**Problem**: The cron job was running at 5 PM UTC instead of 5 PM Eastern Time.

**Solution**: Updated `vercel.json` to use `"0 22 * * *"` (10 PM UTC = 5 PM Eastern during standard time).

### 2. **Environment Variables**
**Check**: Ensure these environment variables are set in Vercel:
- `GEMINI_API_KEY` (preferred) or `API_KEY`
- `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`

**To check**: Go to Vercel Dashboard → Your Project → Settings → Environment Variables

### 3. **Vercel Plan Limitations**
**Hobby Plan Issues**:
- Cron jobs may have reliability issues
- Limited KV store operations
- Cold starts can cause timeouts

**Solutions**:
- Consider upgrading to Pro plan for better reliability
- Use manual triggers as backup

## Debugging Steps

### Step 1: Test Manual Generation
```bash
# Test the manual trigger endpoint
curl -X POST "https://night-divides-the-day.vercel.app/api/manual-trigger?date=2024-12-19"
```

### Step 2: Check Content API
```bash
# Check if content exists for today
curl "https://night-divides-the-day.vercel.app/api/content?date=2024-12-19"
```

### Step 3: Run Test Script
```bash
# Run the test script to check all endpoints
node test-content-generation.js
```

### Step 4: Check Vercel Logs
1. Go to Vercel Dashboard
2. Select your project
3. Go to Functions tab
4. Check logs for `/api/run-cycle` and `/api/manual-trigger`

## Common Error Messages

### "Missing GEMINI_API_KEY"
- **Cause**: API key not set in environment variables
- **Solution**: Add `GEMINI_API_KEY` to Vercel environment variables

### "generation_or_kv_failed"
- **Cause**: Either Gemini API failed or KV store failed
- **Solution**: Check Vercel logs for specific error details

### "empty_response"
- **Cause**: Gemini API returned empty content
- **Solution**: Check if Gemini API is working, try manual trigger

## Manual Recovery

If the cron job fails, you can manually trigger content generation:

1. **Via API**: `POST /api/manual-trigger?date=YYYY-MM-DD`
2. **Via Browser**: Visit the app and trigger auto-generation
3. **Via Vercel**: Manually invoke the function from Vercel dashboard

## Prevention

1. **Monitor**: Set up alerts for failed cron jobs
2. **Backup**: Use manual triggers as backup
3. **Logging**: Enhanced logging added to track issues
4. **Testing**: Regular testing of the generation process

## Next Steps

1. Deploy the updated code with better error handling
2. Test the manual trigger endpoint
3. Monitor the next 5 PM cron job execution
4. Consider upgrading Vercel plan if issues persist
