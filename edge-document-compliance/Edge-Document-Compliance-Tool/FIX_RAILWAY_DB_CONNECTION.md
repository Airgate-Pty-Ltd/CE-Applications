# Fix Railway Database Connection for Local CLI

## Problem
When running `railway run npm run seed:personality` locally, it's trying to connect to `postgres-q7-r.railway.internal`, which is an internal hostname that only works from within Railway's network.

## Solution Options

### Option 1: Use Public Database URL (Recommended)

The `EDCAT_AI_DATABASE_URL` environment variable in Railway is set to use the internal hostname. We need to check if there's a public URL available.

1. **Check Railway Variables:**
   ```bash
   railway variables
   ```

2. **Look for `EDCAT_AI_DATABASE_URL`** - it might be using the internal hostname.

3. **Get the Public Database URL:**
   - Go to Railway Dashboard
   - Select your **EDCAT AI** database service
   - Go to **"Variables"** tab
   - Look for the connection string
   - Or go to **"Connect"** tab to see the public connection string

4. **Update the Variable:**
   - The public URL should look like: `postgresql://user:password@host.railway.app:port/database`
   - NOT: `postgresql://user:password@postgres-q7-r.railway.internal:port/database`

### Option 2: Use Railway's Proxy/Tunnel

Railway CLI might need to use a tunnel for internal connections. Try:

```bash
# Use Railway's proxy for internal connections
railway run --detach npm run seed:personality
```

### Option 3: Check if EDCAT_AI_DATABASE_URL is Set Correctly

The script might be falling back to a default. Let's check what URL it's actually using:

```bash
# Check what Railway is providing
railway variables get EDCAT_AI_DATABASE_URL
```

### Option 4: Use Railway's Database Connection String

1. Go to Railway Dashboard
2. Select **EDCAT AI** database service
3. Click **"Connect"** tab
4. Copy the **"Public Network"** connection string (not Private Network)
5. Set it locally:

```bash
# Set the public URL temporarily
$env:EDCAT_AI_DATABASE_URL="postgresql://user:password@host.railway.app:port/database"
npm run seed:personality
```

### Option 5: Update Railway Variable to Use Public URL

If the `EDCAT_AI_DATABASE_URL` in Railway is set to the internal hostname, update it:

1. Go to Railway Dashboard
2. Select your **EDCAT-Administrator** service
3. Go to **"Variables"** tab
4. Find `EDCAT_AI_DATABASE_URL`
5. Click **Edit**
6. Change from internal hostname to public hostname:
   - **From:** `postgres-q7-r.railway.internal`
   - **To:** `[public-hostname].railway.app` or the actual public hostname

## Quick Diagnostic

Run this to see what Railway is providing:

```bash
# Check all variables
railway variables

# Check specific variable (will show if it exists)
railway variables get EDCAT_AI_DATABASE_URL

# Check if DATABASE_URL is set (fallback)
railway variables get DATABASE_URL
```

## Most Likely Fix

The `EDCAT_AI_DATABASE_URL` in Railway is probably set to use the internal hostname. You need to:

1. Get the **public** connection string from the EDCAT AI database service
2. Update the `EDCAT_AI_DATABASE_URL` variable in Railway to use the public URL
3. Then run the seed script again

## Alternative: Run from Railway's Environment

If updating the variable is complex, you could:
1. Add the seed script to your startup command temporarily
2. Or wait for Railway to add Shell access
3. Or use Railway's API/CLI to execute commands in their environment

Let me know what you find when you check the variables!

