import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import * as models from './models/index.js';
import { createApp } from './app.js';

async function main() {
  await connectDB();
  await Promise.all(Object.values(models).map((m) => m.syncIndexes()));
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
