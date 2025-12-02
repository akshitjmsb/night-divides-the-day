# Using Supabase Access Token

This guide shows how to use your Supabase access token for CLI operations.

## Your Access Token

```
sbp_1f3a4cf6d81da3b010bc2bafad807932a15c150d
```

## Quick Setup

### Method 1: Environment Variable

```bash
# Set the access token
export SUPABASE_ACCESS_TOKEN="sbp_1f3a4cf6d81da3b010bc2bafad807932a15c150d"

# Login with token
supabase login --token "$SUPABASE_ACCESS_TOKEN"

# Now you can use Supabase CLI commands
supabase db push
```

### Method 2: Setup Script

```bash
# Make script executable (if not already)
chmod +x setup-supabase.sh

# Run the setup script
./setup-supabase.sh
```

Or use npm:

```bash
npm run supabase:setup
```

### Method 3: Add to Shell Profile

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_1f3a4cf6d81da3b010bc2bafad807932a15c150d"
```

Then reload:
```bash
source ~/.zshrc  # or source ~/.bashrc
```

## Important Notes

### Access Token vs Anon Key

- **Access Token** (`sbp_...`): Used for CLI operations, API access, project management
- **Anon Key** (`eyJ...`): Used for client-side code in your application

**You need BOTH:**
1. Access token for CLI operations (migrations, project management)
2. Anon key for your application's client-side code

### Getting Your Anon Key

Even with the access token, you still need the anon key for your app:

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **anon/public key** (starts with `eyJ...`)

Add it to your `.env` file:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # Your anon key here
```

## Common Commands with Access Token

```bash
# Set token (if not in profile)
export SUPABASE_ACCESS_TOKEN="sbp_1f3a4cf6d81da3b010bc2bafad807932a15c150d"

# Login
supabase login --token "$SUPABASE_ACCESS_TOKEN"

# Link project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push

# Or use npm scripts
npm run supabase:push
```

## Security

⚠️ **Never commit your access token to git!**

- The token is already in `.gitignore`
- Use environment variables
- Don't share tokens publicly
- Rotate tokens if exposed

## Troubleshooting

### Token Not Working

1. Verify token is correct
2. Check token hasn't expired
3. Ensure you're using `--token` flag correctly
4. Try interactive login: `supabase login`

### Still Need Anon Key

The access token is for CLI/API. Your app still needs:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Get these from Supabase Dashboard → Settings → API.

