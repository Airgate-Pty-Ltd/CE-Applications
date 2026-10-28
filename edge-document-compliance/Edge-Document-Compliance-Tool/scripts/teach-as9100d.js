/**
 * Windows-compatible wrapper for teach:as9100d
 */

process.env.STANDARD_PACK = 'standards/as9100d/pack.yaml';
process.env.DOCS_INVENTORY = 'evidence/inventories/example-docs.json';

// Import and run the main teach script
import('./teach.js').then(() => {
  // Script will run automatically
}).catch(err => {
  console.error('Error running teach script:', err);
  process.exit(1);
});

