import { defineConfig } from "vite";

export default defineConfig({
  // three.js alone is about 600 kB minified (165 kB gzipped), so the default 500 kB warning is noise here.
  build: { chunkSizeWarningLimit: 800 },
});
