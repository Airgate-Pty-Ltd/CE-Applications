# AI-QMS — Handoff

## Purpose

This folder isolates the previously loose AI-QMS build from the other applications in the repository. It contains the FastAPI backend, React frontend, and its Node package commands.

## Current state

This is an inherited, unfinished build. It has not been declared production-ready, and no new production implementation has been started here.

The current contents were moved together from the repository root without changing their source code:

- `backend/` — FastAPI service and Python dependencies
- `frontend/` — React application
- `package.json` and `package-lock.json` — local orchestration commands

## Boundaries

- Work only inside `ai-qms/` for this application.
- Do not import from `pocket-auditor/` or any other application folder.
- Do not modify existing QMS or SharePoint products.
- If behavior is shared, define a versioned contract or adapter rather than reaching into another application's files.

## Existing commands

Run these commands from this folder:

```text
npm install
npm run install:all
npm run start
npm test
```

The backend command starts Uvicorn on port 8001. Confirm dependency availability before claiming the commands pass.

## Production work still required

Before this application can be handed over for production use, document and implement its approved scope, architecture, authentication, organization isolation, source/licence governance, audit data contracts, evidence and findings model, reporting, SharePoint adapter boundary, tests, and deployment process.

Do not copy licensed standards or customer-owned checklist content into shared packages or uncontrolled exports.
