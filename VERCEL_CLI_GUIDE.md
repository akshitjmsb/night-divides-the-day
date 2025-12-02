# Vercel CLI Guide

## ✅ Vercel CLI is Installed and Working

- **Version**: 48.12.0
- **Logged in as**: akshitjmsb
- **Usage**: Use `npx vercel` or add npm scripts

## Common Commands

### Authentication
```bash
npx vercel login          # Login to Vercel
npx vercel logout         # Logout
npx vercel whoami         # Check current user
```

### Projects
```bash
npx vercel projects list              # List all projects
npx vercel projects add <name>        # Create new project
npx vercel link                       # Link current directory to Vercel project
```

### Deployment
```bash
npx vercel                    # Deploy to preview
npx vercel --prod             # Deploy to production
npx vercel --yes              # Skip confirmation prompts
npx vercel inspect <url>      # Inspect a deployment
```

### Environment Variables
```bash
npx vercel env ls                           # List all environment variables
npx vercel env add <name>                   # Add environment variable
npx vercel env rm <name>                    # Remove environment variable
npx vercel env pull .env.local              # Pull env vars to local file
```

### Domains
```bash
npx vercel domains ls          # List domains
npx vercel domains add <name>  # Add domain
npx vercel domains rm <name>   # Remove domain
```

### Logs
```bash
npx vercel logs <url>          # View deployment logs
npx vercel logs --follow      # Follow logs in real-time
```

## Useful for This Project

### Update Environment Variables
```bash
# Add Perplexity API key
npx vercel env add VITE_PERPLEXITY_API_KEY production
npx vercel env add VITE_PERPLEXITY_API_KEY preview
npx vercel env add VITE_PERPLEXITY_API_KEY development

# Add Supabase credentials
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
```

### Deploy
```bash
# Preview deployment
npx vercel

# Production deployment
npx vercel --prod
```

### Pull Environment Variables
```bash
# Pull all env vars to .env.local
npx vercel env pull .env.local
```

## NPM Scripts (Recommended)

Add to `package.json`:

```json
{
  "scripts": {
    "vercel:deploy": "vercel --prod",
    "vercel:preview": "vercel",
    "vercel:env:pull": "vercel env pull .env.local",
    "vercel:env:ls": "vercel env ls",
    "vercel:projects": "vercel projects list"
  }
}
```

Then use:
```bash
npm run vercel:deploy
npm run vercel:preview
npm run vercel:env:pull
```

## Current Project Status

Your project is configured with:
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Cron Job**: `/api/run-cycle` runs daily at 22:00 UTC

## Next Steps

1. **Link Project** (if not already linked):
   ```bash
   npx vercel link
   ```

2. **Add Environment Variables**:
   ```bash
   npx vercel env add VITE_PERPLEXITY_API_KEY
   npx vercel env add VITE_SUPABASE_URL
   npx vercel env add VITE_SUPABASE_ANON_KEY
   ```

3. **Deploy**:
   ```bash
   npx vercel --prod
   ```

