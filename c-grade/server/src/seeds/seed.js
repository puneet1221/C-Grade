import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from './seedData.js';

/**
 * CLI entry point for `npm run seed`. Resets and repopulates C-Grade collections.
 */
async function main() {
  try {
    await connectDB();
    const res = await seedDatabase({ reset: true });
    console.log(`[C-Grade Seed] Completed successfully. Seeded ${res.moviesCount} films.`);
  } catch (err) {
    console.error('[C-Grade Seed] Failed:', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

main();
