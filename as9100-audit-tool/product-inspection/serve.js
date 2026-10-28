/**
 * Dev server for Product Inspection.
 *
 * Serves src/base.html on http://127.0.0.1:7421
 *
 * Source migration status: base.html currently lives at
 *   ../ProductInspection/src/base.html (outside this folder)
 * and is served from there via the ProductInspection-dev launch config.
 *
 * Once Brian approves migrating source into this folder, update SRC_DIR below
 * to path.join(__dirname, 'src') and copy base.html here.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT    = 7421;
const HOST    = '127.0.0.1';
const SRC_DIR = path.join(__dirname, '..', 'ProductInspection', 'src');

const server = http.createServer((req, res) => {
  const file = path.join(SRC_DIR, 'base.html');
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Not found: ${file}\n\nCheck SRC_DIR in serve.js`);
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Product Inspection dev server: http://${HOST}:${PORT}`);
  console.log(`Serving: ${SRC_DIR}/base.html`);
});
