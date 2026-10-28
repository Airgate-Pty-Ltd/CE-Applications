# Railway Environment Variables

## Required Environment Variables

### Database
- `DATABASE_URL` - PostgreSQL connection string (automatically set by Railway PostgreSQL service)

### Server
- `PORT` - Server port (automatically set by Railway, defaults to 8080)
- `NODE_ENV` - Environment (set to `production` on Railway)

## Optional Environment Variables

### Regulatory Web Crawler
- `ENABLE_NET` - Set to `true` to enable regulatory web crawling functionality
  - **Default**: Not set (disabled)
  - **Purpose**: Allows the application to fetch regulations from the internet
  - **Security**: Only fetches from whitelisted domains in `config/sources.regs.yaml`
  - **How to set in Railway**:
    1. Go to your Railway project
    2. Select your service
    3. Go to "Variables" tab
    4. Click "New Variable"
    5. Name: `ENABLE_NET`
    6. Value: `true`
    7. Click "Add"

### OpenAI (if using AI features)
- `OPENAI_API_KEY` - Your OpenAI API key for AI-powered features

## Setting Environment Variables in Railway

1. Navigate to your Railway project dashboard
2. Select the service that needs the variable
3. Click on the "Variables" tab
4. Click "New Variable"
5. Enter the variable name and value
6. Click "Add"
7. Railway will automatically redeploy with the new variable

## Important Notes

- **Ephemeral Filesystem**: Railway uses an ephemeral filesystem. Files uploaded to the server are lost on redeploy. Consider using:
  - Database storage (for small files)
  - External storage (S3, Cloudflare R2, etc.) for larger files
  - Railway volumes (for persistent storage)

- **ENABLE_NET Security**: When `ENABLE_NET=true`, the application can make outbound HTTP requests, but only to domains whitelisted in `config/sources.regs.yaml`. This is a security feature to prevent arbitrary network access.

