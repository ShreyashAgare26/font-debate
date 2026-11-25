import { defineConfig } from "vite";

// Cross-origin isolation lets the speech model run on several threads (about 4x faster than one).
// "credentialless" keeps Google Fonts and the model download working without special headers on their side.
const isolation = { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "credentialless" };

export default defineConfig({
  // three.js alone is about 600 kB minified (165 kB gzipped), so the default 500 kB warning is noise here.
  build: { chunkSizeWarningLimit: 800 },
  // The speech worker imports kokoro-js, which code-splits; classic workers cannot
  worker: { format: "es" },
  server: { headers: isolation },
  preview: { headers: isolation },
});
