import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://kanishkmittal.dev',
  devToolbar: { enabled: false },
  // three.js ships as one lazy chunk, loaded after the page is usable.
  vite: { build: { chunkSizeWarningLimit: 700 } },
});
