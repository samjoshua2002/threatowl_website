import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { handle } from './server/scan.js';

// The live site scanner's server checks run as middleware in dev and preview; in production deploy api/scan.js.
const scanApi = () => {
  const mount = (server) => { server.middlewares.use('/api/scan', (req, res) => { handle(req, res).catch(() => { res.statusCode = 500; res.end('{"error":"failed"}'); }); }); };
  return { name: 'scan-api', configureServer: mount, configurePreviewServer: mount };
};

export default defineConfig({
  plugins: [react(), scanApi()],
  server: { port: 5173 },
});
