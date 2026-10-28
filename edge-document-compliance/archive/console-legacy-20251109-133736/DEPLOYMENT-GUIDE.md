# 🚀 Railway Deployment Guide

## ✅ Code Status
- **Branch**: `claude/using-the-i-011CUsf2WLhcZ6QDxjT23w3J`
- **Status**: All code committed and pushed
- **Latest Commit**: `99c76b4 - docs: add comprehensive system overview and usage guide`

---

## 📦 What's Been Deployed to GitHub

✅ **Complete Backend System** (3,563 lines of new code)
- PostgreSQL database layer
- 15 API endpoints
- NLP requirement extraction
- PDF/DOCX parsers
- Gap analysis engine
- Requirements Traceability Matrix

✅ **Dependencies Installed**
- `pg` - PostgreSQL client
- `multer` - File upload handling
- `pdf-parse` - PDF text extraction
- `mammoth` - DOCX text extraction
- `natural` - NLP processing
- `uuid` - Unique identifiers

✅ **Railway Configuration**
- `railway.toml` - Build and deploy config
- `.railwayignore` - Deployment exclusions
- Health check endpoint (`/health`)

---

## 🎯 Railway Deployment Steps

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Sign in with your GitHub account
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose: `Airgate-Pty-Ltd/Edge-Document-Compliance`
6. Select branch: `claude/using-the-i-011CUsf2WLhcZ6QDxjT23w3J`

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically:
   - Create a PostgreSQL instance
   - Set the `DATABASE_URL` environment variable
   - Link it to your service

### Step 3: Configure Auto-Deploy

1. Go to **Settings** → **Source**
2. Ensure **"Auto Deploy"** is enabled
3. Set **Deploy Branch**: `claude/using-the-i-011CUsf2WLhcZ6QDxjT23w3J`
4. Save settings

### Step 4: Deploy!

Railway will automatically:
1. Pull code from GitHub
2. Run `npm install`
3. Run `npm start` (starts `node server.js`)
4. Initialize database schema
5. Expose your app on a public URL

---

## 🔍 Verify Deployment

Once deployed, Railway gives you a URL like: `https://your-app.up.railway.app`

### Test the deployment:

```bash
# Health check
curl https://your-app.up.railway.app/health

# Should return:
# {"status":"ok","timestamp":"2025-..."}

# Check endpoints
curl https://your-app.up.railway.app/api/assessments

# With DATABASE_URL set, should return:
# {"success":true,"assessments":[]}
```

---

## 📊 What Happens on Deploy

1. **Build Phase**:
   ```
   npm install
   → Installs all dependencies from package.json
   ```

2. **Start Phase**:
   ```
   npm start
   → Runs: node server.js
   → Initializes PostgreSQL schema
   → Starts Express server on $PORT
   ```

3. **Database Initialization**:
   - Connects to PostgreSQL using `DATABASE_URL`
   - Runs `database/schema.sql`
   - Creates all tables, indexes, triggers
   - Server becomes ready

---

## 🌐 Environment Variables

Railway auto-configures these:

| Variable | Set By | Value |
|----------|--------|-------|
| `DATABASE_URL` | Railway PostgreSQL | `postgresql://...` |
| `PORT` | Railway | Dynamic (e.g., 3000) |
| `NODE_ENV` | You (optional) | `production` |

**No manual configuration needed!** Railway handles everything.

---

## 🔧 Post-Deployment Configuration

### Optional Environment Variables

You can add these in Railway Settings → Variables:

```bash
NODE_ENV=production  # Already set in railway.toml
```

That's it! The system is designed to work out-of-the-box.

---

## 📈 Monitoring

Railway provides:
- **Build Logs**: See npm install progress
- **Deploy Logs**: See server startup
- **Runtime Logs**: See application logs
- **Metrics**: CPU, Memory, Network usage

### View Logs:
1. Go to your Railway project
2. Click on your service
3. Click **"Deployments"**
4. Select latest deployment
5. View **"Build Logs"** and **"Deploy Logs"**

---

## 🧪 Testing Your Deployed App

### 1. Create a Customer
```bash
curl -X POST https://your-app.up.railway.app/api/customers \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Corp",
    "contact_name": "John Doe",
    "contact_email": "john@test.com"
  }'
```

### 2. Upload a Standard
```bash
curl -F "standard=@path/to/standard.pdf" \
     -F "name=AS9100:2016" \
     -F "title=Aerospace Quality Standard" \
     https://your-app.up.railway.app/api/standards/upload
```

### 3. Create an Assessment
```bash
curl -X POST https://your-app.up.railway.app/api/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "standard": "AS9100:2016",
    "customer": "Test Corp",
    "owner": "Jane Auditor"
  }'
```

---

## 🔄 Continuous Deployment

Now that Railway is connected:

1. **Make changes locally**
2. **Commit to git**
   ```bash
   git add .
   git commit -m "your changes"
   ```
3. **Push to GitHub**
   ```bash
   git push
   ```
4. **Railway auto-deploys!** 🎉

Watch the deployment in Railway dashboard.

---

## 🐛 Troubleshooting

### Build Fails
- Check **Build Logs** in Railway
- Verify `package.json` has all dependencies
- Ensure Node version compatibility

### Database Connection Error
- Verify PostgreSQL database is added in Railway
- Check `DATABASE_URL` is set in Variables
- Database should be in same project

### App Crashes
- Check **Deploy Logs** for error messages
- Verify port binding (Railway sets `$PORT`)
- Check database schema initialized

### File Uploads Fail
- Railway provides persistent disk by default
- Check logs for permission errors
- Verify multer configuration

---

## 📊 System Requirements Met

✅ **PostgreSQL Database**: Added via Railway plugin
✅ **File Storage**: Railway provides persistent disk
✅ **Environment Variables**: Auto-configured by Railway
✅ **HTTPS**: Automatically provided by Railway
✅ **Auto-Deploy**: Triggered on git push
✅ **Health Checks**: `/health` endpoint available
✅ **Logging**: Comprehensive console logging
✅ **Error Handling**: Graceful error responses

---

## 🎯 Deployment Checklist

- [x] Code committed to GitHub
- [x] Railway configuration files added
- [x] Dependencies listed in package.json
- [x] Database schema defined
- [x] Health check endpoint created
- [x] Environment variables documented
- [ ] **Railway project created** ← DO THIS NOW
- [ ] **PostgreSQL added** ← DO THIS NOW
- [ ] **Auto-deploy configured** ← DO THIS NOW

---

## 🚀 Ready to Deploy!

**Everything is pushed and ready.**

Next steps:
1. Go to [railway.app](https://railway.app)
2. Create project from this GitHub repo
3. Add PostgreSQL database
4. Watch it deploy automatically!

Your complete document assessment system will be live in ~2 minutes! 🎉

---

## 📞 Support

- **Railway Docs**: https://docs.railway.app
- **System Overview**: See `SYSTEM-OVERVIEW.md`
- **Health Check**: `https://your-app.up.railway.app/health`

**Current Status**: ✅ All code pushed, ready for Railway deployment
