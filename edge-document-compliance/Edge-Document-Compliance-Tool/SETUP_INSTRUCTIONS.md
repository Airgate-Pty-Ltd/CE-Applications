# ComplianceGap MVP - Setup Instructions

## ✅ What's Been Created

The complete project structure has been set up according to your roadmap:

### Database Schemas
- ✅ `backend/src/database/schema/compliance-lib.sql` - Compliance library schema
- ✅ `backend/src/database/schema/customer-data.sql` - Customer data schema

### Backend Structure
- ✅ `backend/src/app.js` - Express application setup
- ✅ `backend/src/server.js` - Server entry point
- ✅ `backend/src/database/connection.js` - PostgreSQL connection pool
- ✅ `backend/package.json` - Dependencies configured
- ✅ `backend/.env.example` - Environment template

### Frontend Structure
- ✅ `frontend/.env.example` - Frontend environment template
- ✅ `frontend/.gitignore` - Frontend gitignore

### Configuration
- ✅ `docker-compose.yml` - Local PostgreSQL setup
- ✅ `.github/workflows/deploy.yml` - Railway deployment workflow
- ✅ `.gitignore` - Root gitignore
- ✅ `README.md` - Project overview

## Next Steps

### 1. Initialize Frontend (React/Vite)

```bash
cd frontend
npm create vite@latest . -- --template react
npm install axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 2. Set Up Railway PostgreSQL

1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL service
4. Copy connection string
5. Update `backend/.env` with `DATABASE_URL`

### 3. Run Database Schemas

1. In Railway dashboard, open PostgreSQL
2. Click "Connect" → "Query"
3. Copy and run `backend/src/database/schema/compliance-lib.sql`
4. Copy and run `backend/src/database/schema/customer-data.sql`

### 4. Test Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL
npm run dev
```

Visit `http://localhost:5000/health` to verify.

### 5. Create GitHub Repository

```bash
git remote add origin https://github.com/YOUR_USERNAME/compliance-gap-mvp.git
git push -u origin main
```

### 6. Set Up Railway Auto-Deploy

1. In Railway, create new service
2. Connect GitHub repository
3. Select `compliance-gap-mvp` repo
4. Railway auto-deploys on push to main

## File Creation Priority

Following your roadmap:

### Priority 1: Database & Connections ✅ (Done)
- [x] Database schemas
- [x] Database connection
- [x] Express app setup

### Priority 2: File Upload & Parser (Next)
- [ ] `backend/src/utils/fileParser.js`
- [ ] `backend/src/routes/upload.js`
- [ ] `backend/src/services/parser.js`
- [ ] `backend/src/utils/confidence.js`

### Priority 3: Gap Analyzer
- [ ] `backend/src/services/analyzer.js`
- [ ] `backend/src/utils/similarity.js`
- [ ] `backend/src/routes/analyze.js`

### Priority 4: Clarification Engine
- [ ] `backend/src/services/clarifier.js`
- [ ] `backend/src/routes/clarification.js`

### Priority 5: Chat UI & Frontend
- [ ] `frontend/src/App.jsx`
- [ ] `frontend/src/components/Chat/ChatWindow.jsx` (you have this!)
- [ ] `frontend/src/components/Upload/StandardUpload.jsx`
- [ ] `frontend/src/components/Upload/CustomerDocUpload.jsx`
- [ ] `frontend/src/services/api.js`

### Priority 6: Learning & Export
- [ ] `backend/src/services/learner.js`
- [ ] `backend/src/routes/feedback.js`
- [ ] `backend/src/services/exporter.js`
- [ ] `backend/src/routes/export.js`

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@host:5432/database
PORT=5000
NODE_ENV=development
MAX_FILE_SIZE=10485760
PARSER_CONFIDENCE_THRESHOLD=0.55
ANALYZER_CONFIDENCE_THRESHOLD=0.70
LEARNING_IMPROVEMENT_THRESHOLD=0.05
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## Testing Locally

### Start PostgreSQL (Docker)
```bash
docker-compose up -d
```

### Start Backend
```bash
cd backend
npm run dev
```

### Start Frontend
```bash
cd frontend
npm run dev
```

## Notes

- All files follow ES modules (`type: "module"`)
- Database uses 1 PostgreSQL instance with 2 schemas (as recommended)
- Railway auto-deploys on push to main branch
- Environment files are git-ignored (use `.env.example` as template)

