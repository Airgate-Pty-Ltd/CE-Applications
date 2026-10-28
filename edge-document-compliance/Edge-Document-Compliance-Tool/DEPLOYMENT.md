# EDCAT Administrator Deployment Guide

## Quick Start

### Local Development

1. **Prerequisites**
   ```bash
   # Node.js 18+ required
   node --version
   
   # PostgreSQL 15+ required
   psql --version
   ```

2. **Install Dependencies**
   ```bash
   cd edcat-administrator
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Setup Databases**
   ```bash
   # Option 1: Using Docker
   docker-compose up -d
   
   # Option 2: Manual PostgreSQL setup
   # Create databases:
   # - edcat_compliance_library
   # - edcat_customer_data
   ```

5. **Run Migrations**
   ```bash
   npm run migrate
   ```

6. **Seed Sample Data (Optional)**
   ```bash
   npm run seed
   ```

7. **Start Server**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

8. **Access Application**
   ```
   http://localhost:3000
   ```

## Railway Deployment

### Prerequisites

- Railway account
- GitHub repository connected

### Steps

1. **Create New Project in Railway**
   - Connect GitHub repository
   - Select `edcat-administrator` directory

2. **Add PostgreSQL Services**
   - Add PostgreSQL service (Compliance Library)
   - Add PostgreSQL service (Customer Data)
   - Note connection strings

3. **Configure Environment Variables**
   ```
   DB_HOST=<railway-postgres-host>
   DB_PORT=5432
   DB_NAME_COMPLIANCE=<compliance-db-name>
   DB_NAME_CUSTOMER=<customer-db-name>
   DB_USER=<railway-user>
   DB_PASSWORD=<railway-password>
   PORT=3000
   NODE_ENV=production
   OPENAI_API_KEY=<your-openai-key>
   ```

4. **Deploy**
   - Railway will auto-detect Node.js
   - Build and deploy automatically
   - Run migrations on first deploy:
     ```bash
     npm run migrate
     ```

5. **Verify Deployment**
   - Check health endpoint: `https://your-app.railway.app/health`
   - Access application: `https://your-app.railway.app`

## Environment Variables

### Required

- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME_COMPLIANCE` - Compliance library database name
- `DB_NAME_CUSTOMER` - Customer data database name
- `DB_USER` - PostgreSQL username
- `DB_PASSWORD` - PostgreSQL password
- `PORT` - Server port (default: 3000)

### Optional

- `NODE_ENV` - Environment (development/production)
- `OPENAI_API_KEY` - OpenAI API key for AI parsing
- `MAX_FILE_SIZE` - Max upload size in bytes (default: 10MB)
- `UPLOAD_DIR` - Upload directory path

## Database Setup

### Manual Setup

```sql
-- Create databases
CREATE DATABASE edcat_compliance_library;
CREATE DATABASE edcat_customer_data;

-- Run schema on each database
\c edcat_compliance_library
\i database/schema.sql

\c edcat_customer_data
\i database/schema.sql
```

### Using Migrations

```bash
# The migrate script handles both databases
npm run migrate
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Databases created and migrated
- [ ] OpenAI API key set (if using AI parsing)
- [ ] File upload directory exists and is writable
- [ ] CORS configured for production domain
- [ ] Rate limiting configured
- [ ] Error logging configured
- [ ] Health check endpoint working
- [ ] SSL/HTTPS enabled (Railway handles this)

## Troubleshooting

### Database Connection Issues

```bash
# Test connections
psql -h $DB_HOST -U $DB_USER -d $DB_NAME_COMPLIANCE
psql -h $DB_HOST -U $DB_USER -d $DB_NAME_CUSTOMER
```

### Migration Issues

```bash
# Check if tables exist
psql -h $DB_HOST -U $DB_USER -d $DB_NAME_COMPLIANCE -c "\dt"
```

### Port Issues

```bash
# Check if port is in use
lsof -i :3000
# or on Windows
netstat -ano | findstr :3000
```

## Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

### Logs

- Development: Console output
- Production: Railway logs dashboard
- Database: PostgreSQL logs

## Backup

### Database Backup

```bash
# Compliance Library
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME_COMPLIANCE > compliance_backup.sql

# Customer Data
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME_CUSTOMER > customer_backup.sql
```

### Restore

```bash
# Compliance Library
psql -h $DB_HOST -U $DB_USER $DB_NAME_COMPLIANCE < compliance_backup.sql

# Customer Data
psql -h $DB_HOST -U $DB_USER $DB_NAME_CUSTOMER < customer_backup.sql
```

