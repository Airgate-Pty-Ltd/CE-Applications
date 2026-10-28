# Data Directory

Place your `Conform-Edge_Compliance_Knowledge_Pack.json` file in this directory.

The system will automatically detect it when running the ingestion script.

## File Structure

```
data/
  ├── Conform-Edge_Compliance_Knowledge_Pack.json  # Place your knowledge pack here
  └── README.md                                     # This file
```

## Quick Start

1. Copy your JSON dataset to this directory as `Conform-Edge_Compliance_Knowledge_Pack.json`
2. Run the ingestion script: `npm run ingest:knowledge-pack`
3. The embeddings will be stored in the database and ready for use

## Alternative Locations

The system also searches for the knowledge pack in:
- `backend/data/Conform-Edge_Compliance_Knowledge_Pack.json`
- `data/compliance-knowledge-pack.json`
- Current working directory: `data/Conform-Edge_Compliance_Knowledge_Pack.json`

Or provide a custom path: `npm run ingest:knowledge-pack /path/to/your/file.json`

