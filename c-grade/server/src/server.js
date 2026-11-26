import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { ensureSeeded } from './seeds/seedData.js';
import { enrichCatalogFromTmdb } from './services/tmdb.service.js';

/**
 * Standalone entry point for the C-Grade Express backend server.
 */
async function startServer() {
  await connectDB();
  await ensureSeeded();
  await enrichCatalogFromTmdb().catch((err) => {
    console.warn('[TMDB] Startup enrichment skipped:', err.message);
  });

  const app = createApp();
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`[C-Grade Server] Listening on http://localhost:${env.PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[C-Grade Server] Failed to start:', err);
  process.exit(1);
});
