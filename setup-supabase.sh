#!/bin/bash

# Supabase Setup Script
# Uses access token to authenticate and set up the project

set -e

# Load environment variables from .env.local if present
if [ -f .env.local ]; then
    echo "📄 Loading environment variables from .env.local..."
    # Source .env.local but ignore comment lines
    set -a
    source .env.local
    set +a
fi

# Check if SUPABASE_ACCESS_TOKEN is set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  SUPABASE_ACCESS_TOKEN is not set."
    echo "   Please set it before running this script:"
    echo "   export SUPABASE_ACCESS_TOKEN='your_token_here'"
    echo "   Or run: SUPABASE_ACCESS_TOKEN='...' ./setup-supabase.sh"
    
    # Try interactive login if token is missing
    echo "   Attempting interactive login..."
    supabase login
else
    echo "🔐 Authenticating with provided access token..."
    # Try to login with token
    if supabase login --token "$SUPABASE_ACCESS_TOKEN" 2>/dev/null; then
        echo "✅ Authenticated with access token"
    else
        echo "❌ Token login failed. Please check your token."
        exit 1
    fi
fi

# Check if project is already linked
if [ -f ".supabase/config.toml" ] || [ -f "supabase/.temp/project-ref" ]; then
    echo "✅ Project already linked"
    PROJECT_REF=$(cat supabase/.temp/project-ref 2>/dev/null || echo "")
    if [ -n "$PROJECT_REF" ]; then
        echo "   Project ref: $PROJECT_REF"
    fi
else
    echo "📋 Please link your project:"
    echo "   supabase link --project-ref your-project-ref"
    echo ""
    echo "   Or create a new project:"
    echo "   supabase projects create night-divides-the-day --org-id your-org-id --region us-east-1 --db-password your-secure-password"
    exit 1
fi

# Push migrations
echo "📊 Applying database migrations..."
supabase db push

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Get your project credentials from Supabase Dashboard:"
echo "   - Go to Settings → API"
echo "   - Copy Project URL and anon/public key"
echo ""
echo "2. Create .env file with:"
echo "   VITE_SUPABASE_URL=your_project_url"
echo "   VITE_SUPABASE_ANON_KEY=your_anon_key"
echo ""
echo "3. Run: npm run dev"

