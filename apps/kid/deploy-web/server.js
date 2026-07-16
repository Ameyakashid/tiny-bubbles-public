// Minimal static server for the Tiny Bubbles web (SPA) build on Cloud Run.
// Serves the exported `dist/` at root and falls back to index.html so the
// expo-router client-side routes resolve on a hard refresh / deep link.
const express = require("express");
const path = require("path");

const app = express();
const DIST = path.join(__dirname, "dist");

// Long-cache the hashed static assets; the HTML shell stays uncached.
app.use(
  express.static(DIST, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache");
      } else if (filePath.includes(`${path.sep}_expo${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  })
);

// SPA fallback: any unmatched GET returns the app shell.
app.get("*", (_req, res) => {
  res.sendFile(path.join(DIST, "index.html"));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Tiny Bubbles web listening on :${port}`);
});
