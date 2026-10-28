# Regulatory Web Crawler System

## Overview

This system automatically fetches regulations from whitelisted aviation authority websites, parses them into structured clause packs, and stores them for use in GAP analysis.

## Architecture

- **Config**: `config/sources.regs.yaml` - Whitelist of regulatory sources
- **Crawler**: `src/online/RegCrawler.js` - Main orchestrator
- **Adapters**: `src/online/adapters/` - Source-specific scrapers (FAA, EASA, UK CAA, CAAC, AFAC)
- **Parsers**: `src/online/Parsers.js` - HTML/PDF/DOCX to text extraction
- **Normalizer**: `src/online/Normalizer.js` - Text to clause segmentation
- **PackWriter**: `src/online/PackWriter.js` - YAML pack generation with versioning
- **Diff**: `src/online/Diff.js` - Change detection and flagging

## Security & Controls

- **Bounded Net Access**: Only works when `ENABLE_NET=true` environment variable is set
- **Whitelist Only**: Only fetches from domains listed in `config/sources.regs.yaml`
- **Rate Limiting**: Configurable timeout and retry settings
- **Legal Compliance**: Respects robots.txt (configurable)

## Usage

### CLI Commands

```bash
# Refresh all regulations (requires ENABLE_NET=true)
ENABLE_NET=true npm run regs:refresh

# Verify all packs against schema
npm run regs:verify
```

### API Endpoints

- **POST /api/regs/refresh** - Trigger regulation refresh
- **GET /api/regs/status** - Get status of regulation packs

### Frontend

Click the "🔄 Refresh Regulations" button in the REGULATIONS section of the Compliance Documents Library.

## Output Structure

```
regs/
  {authority-id}/
    {reg-id}/
      pack.yaml          # Current pack
      latest.hash        # SHA256 hash

regs-registry/
  history/
    {authority-id}/
      {reg-id}/
        {timestamp}__{hash}.yaml  # Version history
  alerts/
    {authority-id}__{reg-id}__{timestamp}.json  # Failure logs
```

## RED FLAG Conditions

The system flags suspicious changes:
- **ZERO_CLAUSES**: No clauses extracted
- **CLAUSE_DROP_***: Clause count dropped >10%
- **LOST_KEY_TERMS**: Key terms (shall, must, etc.) disappeared
- **PUBLISHER_CHANGE**: Publisher/jurisdiction changed unexpectedly

## Adding New Sources

1. Add authority to `config/sources.regs.yaml`
2. Create adapter in `src/online/adapters/{authority}.js`
3. Register adapter in `RegCrawler.js` routeAndFetch function

## Dependencies

- `node-fetch` - HTTP requests
- `cheerio` - HTML parsing
- `pdf-parse` - PDF extraction
- `js-yaml` - YAML processing
- `ajv` - Schema validation

