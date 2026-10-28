# Database Migrations

This directory contains database migration files that create and update the database schema.

## Migration Files

- `001_initial_schema.js` - Creates the complete database schema (2 schemas, 9 tables, indices)

## Running Migrations

### Automatic (Railway)
Migrations run automatically on deployment if `DATABASE_URL` is set.

### Manual
```bash
# From backend directory
npm run migrate

# Or directly
node src/database/migrate.js
```

## Migration System

- Migrations are tracked in `schema_migrations` table
- Only pending migrations are executed
- Safe to run multiple times
- Each migration runs in a transaction (rolls back on error)

## Adding New Migrations

1. Create a new file: `002_description.js`
2. Export `up` and `down` functions:
   ```javascript
   export const up = async (client) => {
     // Migration code
   };
   
   export const down = async (client) => {
     // Rollback code
   };
   ```
3. Run migrations: `npm run migrate`

