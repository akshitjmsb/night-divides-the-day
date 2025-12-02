#!/bin/bash

# Supabase Setup Script
# Uses access token to authenticate and set up the project

set -e

SUPABASE_ACCESS_TOKEN="sbp_1f3a4cf6d81da3b010bc2bafad807932a15c150d"

echo "🚀 Setting up Supabase for Night Divides the Day..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    
    # Detect OS and install
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "📦 Installing Supabase CLI via Homebrew..."
        brew install supabase/tap/supabase
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "📦 Please install Supabase CLI manually:"
        echo "   brew install supabase/tap/supabase"
        echo "   Or download from: https://github.com/supabase/cli/releases"
        exit 1
    else
        echo "❌ Unsupported OS. Please install Supabase CLI manually."
        exit 1
    fi
fi

echo "✅ Supabase CLI found"

# Login with access token
echo "🔐 Authenticating with Supabase..."
export SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN"

# Try to login (if token auth is supported)
if supabase login --token "$SUPABASE_ACCESS_TOKEN" 2>/dev/null; then
    echo "✅ Authenticated with access token"
else
    echo "⚠️  Token login not available, using interactive login..."
    echo "   You can also set the token as an environment variable:"
    echo "   export SUPABASE_ACCESS_TOKEN='$SUPABASE_ACCESS_TOKEN'"
    supabase login
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

