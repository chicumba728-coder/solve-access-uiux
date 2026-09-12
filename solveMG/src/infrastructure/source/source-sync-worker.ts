import { env } from '../config/env.js';
import { syncFromSource } from '../../application/source-sync/source-sync-service.js';

let timer: NodeJS.Timeout | undefined;
let running = false;

export function startSourceSyncWorker(): void {
  if (timer || !env.SOURCE_DATABASE_URL) return;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      console.info('[source-sync] sincronização Neon origem -> BD local iniciada');
      console.info('[source-sync] resultado', await syncFromSource());
    } catch (error) {
      console.error('[source-sync] falha; a origem permaneceu intacta', error);
    } finally {
      running = false;
    }
  };
  void run();
  timer = setInterval(() => void run(), env.SOURCE_SYNC_INTERVAL_SECONDS * 1000);
  timer.unref();
}

export function stopSourceSyncWorker(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = undefined;
}