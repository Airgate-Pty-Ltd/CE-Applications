# EDCAT Administrator Tool

Administrative interface for EDCAT (Edge Document Compliance Assessment Tool).

## Location

This project has been moved to its own root directory:
`C:\Users\oleab\OneDrive\Conform-Edge\EDCAT-Administrator\`

## Purpose

The EDCAT Administrator Tool provides:
- Administrative dashboard
- User management
- System configuration
- Analytics and monitoring
- Report building
- Executive dashboard

## Structure

```
EDCAT-Administrator/
├── server.js             # Main server
├── routes/               # API routes
├── services/             # Business logic services
├── public/               # Frontend UI
│   └── index.html        # Main admin interface
├── database/             # Database schemas
└── scripts/              # Utility scripts
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `env.example` to `.env` and update the values (at minimum set `DATABASE_URL`).

3. Run migrations (requires a reachable PostgreSQL instance):
   ```bash
   npm run migrate
   ```

4. Start the server (prestart automatically runs syntax + migrations):
   ```bash
   npm start
   ```

To run the smoke test locally (starts the server, waits for `/health`, then exits):
```bash
SMOKE_START_SERVER=true npm run smoke
```

## Related Projects

- **Edge-Document-Compliance-Tool**: Located at `C:\Users\oleab\OneDrive\Conform-Edge\Edge-Document-Compliance\Edge-Document-Compliance-Tool\`
  - Full-featured compliance analysis system
  - Document parsing and requirement extraction
  - GAP analysis engine

