import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { createApp } from './c-grade/server/src/app.js';
import { connectDB } from './c-grade/server/src/config/db.js';
import { ensureSeeded } from './c-grade/server/src/seeds/seedData.js';
import { enrichCatalogFromTmdb } from './c-grade/server/src/services/tmdb.service.js';

const PORT = Number(process.env.PORT) || 3000;

/**
 * Full-stack server entry point combining the C-Grade Express v1 API
 * with Vite dev middleware (or static dist bundle in production) on port 3000.
 */
async function bootstrap() {
  await connectDB();
  await ensureSeeded();
  await Promise.race([
    enrichCatalogFromTmdb().catch((err) => {
      console.warn('[TMDB] Startup enrichment skipped:', err.message);
    }),
    new Promise((resolve) => setTimeout(resolve, 8000)),
  ]);

  const server = express();
  server.use(createApp());

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    server.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    server.use(express.static(distDir));
    server.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found');
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[C-Grade] Full-stack server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[C-Grade] Startup error:', err);
  process.exit(1);
});
