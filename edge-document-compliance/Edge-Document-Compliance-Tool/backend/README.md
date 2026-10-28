# ComplianceGap Backend

Backend server for ComplianceGap MVP - Task-focused compliance analysis with chat.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

3. Set up database schema:
   - Connect to your Railway PostgreSQL instance
   - Run `src/database/schema/compliance-lib.sql`
   - Run `src/database/schema/customer-data.sql`

4. Start development server:
```bash
npm run dev
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string from Railway
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `MAX_FILE_SIZE` - Maximum upload size in bytes
- `PARSER_CONFIDENCE_THRESHOLD` - Minimum confidence for requirement extraction
- `ANALYZER_CONFIDENCE_THRESHOLD` - Minimum confidence for gap analysis
- `LEARNING_IMPROVEMENT_THRESHOLD` - Minimum improvement to create new model version

## API Endpoints

- `GET /health` - Health check
- `POST /api/upload` - Upload standards or customer documents
- `POST /api/analyze` - Start gap analysis
- `POST /api/clarification` - Respond to clarification questions
- `POST /api/feedback` - Submit accuracy rating
- `GET /api/export/:id` - Download analysis report

## Database

Uses PostgreSQL with two schemas:
- `compliance_lib` - Standards and requirements
- `customer_data` - Customer documents and analyses

