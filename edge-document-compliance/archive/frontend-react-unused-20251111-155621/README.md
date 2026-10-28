# Archived: React Frontend (Unused)

**Archived Date:** 2025-11-11  
**Reason:** Not currently in use - backend serves vanilla HTML/JS application

## What This Is

This is a React/Vite frontend application that was created but is not currently being served by the backend server.

## Current Active Application

The active application is located at:
- `edcat-backend/public/index.html` - Vanilla JavaScript/HTML application
- Served by `edcat-backend/server.js` via Express static file serving

## Why Archived

- The backend server (`edcat-backend/server.js`) serves static files from `edcat-backend/public/`
- All current development and Compliance Intelligence module is in the vanilla HTML app
- This React frontend was not integrated or being used
- Archived to avoid confusion and accidental use

## If You Need to Use This

1. Update `edcat-backend/server.js` to serve the React build instead of static HTML
2. Build the React app: `cd archive/frontend-react-unused-20251111-155621/edcat-frontend && npm install && npm run build`
3. Configure the server to serve the React build output
4. Migrate Compliance Intelligence and other modules to React components

## Contents

- React 18.2.0 application
- Vite build system
- API service files for various backend endpoints
- Component structure (mostly empty/stub)

## Note

This frontend was never integrated with the backend. The backend currently serves a vanilla HTML/JavaScript application from `edcat-backend/public/index.html` which contains all active features including the Compliance Intelligence module.

