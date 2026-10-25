import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { handleRequest } from './server/index.js';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'n8n-webhook-api-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';
          if (
            url.startsWith('/webhook') ||
            url.startsWith('/webhook-test') ||
            url === '/healthz' ||
            url === '/health'
          ) {
            handleRequest(req, res);
            return;
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 5173,
    cors: true,
  },
});
