import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import manifest from './manifest.json' assert { type: 'json' };

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    crx({ manifest }),
  ],
  build: {
    // Vite 5+ requires this to bundle correctly with crx plugin in some cases
    modulePreload: false,
  },
});
