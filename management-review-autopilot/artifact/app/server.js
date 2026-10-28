// Management Review Autopilot — zero-dependency static server (Railway-ready)
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const SRC = path.join(__dirname, "src");
const MIME = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript", ".svg":"image/svg+xml", ".png":"image/png" };

const server = http.createServer((req, res) => {
  const url = (req.url || "/").split("?")[0];
  if (url === "/health") {
    res.writeHead(200, {"Content-Type":"application/json"});
    return res.end(JSON.stringify({status:"ok", app:"management-review-autopilot", version:"1.0.0"}));
  }
  const file = url === "/" ? "index.html" : url.replace(/^\/+/, "");
  const full = path.join(SRC, path.normalize(file));
  if (!full.startsWith(SRC)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404, {"Content-Type":"text/plain"}); return res.end("Not found"); }
    res.writeHead(200, {"Content-Type": MIME[path.extname(full)] || "application/octet-stream"});
    res.end(data);
  });
});
server.listen(PORT, () => console.log(`MRA listening on :${PORT} — health at /health`));
