import { buildApp } from './presentation/http/app.js';
import { env } from './infrastructure/config/env.js';
import { disconnectDatabase } from './infrastructure/database/prisma.js';
import { closeSourcePool } from './infrastructure/source/source-db.js';
import { startSourceSyncWorker, stopSourceSyncWorker } from './infrastructure/source/source-sync-worker.js';

const app = buildApp();
const server = app.listen(env.PORT, '0.0.0.0', () => console.log(`SOLVE ACESS listening on port ${env.PORT}`));
startSourceSyncWorker();

const shutdown = async (signal: string) => {
  console.log(`${signal}: shutdown requested`);
  stopSourceSyncWorker();
  server.close(async () => {
    await closeSourcePool();
    await disconnectDatabase();
    process.exit(0);
  });
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
