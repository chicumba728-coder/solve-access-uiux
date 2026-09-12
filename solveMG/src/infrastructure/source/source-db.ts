import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

let pool: pg.Pool | undefined;

export function sourcePool(): pg.Pool {
  if (!env.SOURCE_DATABASE_URL) throw new Error('SOURCE_DATABASE_URL is not configured');
  if (!pool) {
    pool = new Pool({
      connectionString: env.SOURCE_DATABASE_URL,
      options: '-c default_transaction_read_only=on',
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 30_000,
      application_name: 'solve-acess-source-readonly-bridge',
      ssl: { rejectUnauthorized: true },
    });
  }
  return pool;
}

export async function closeSourcePool(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}

export function sourceTable(table: string): string {
  const allowed = new Set(['customers', 'plans', 'subscriptions', 'payments', 'checkins', 'access', 'ovg_members', 'clientes', 'acessos', 'terminais', 'relatorios', 'fila_sincronizacao_ovg', 'solve_access_logs']);
  if (!allowed.has(table)) throw new Error(`Source table is not allowlisted: ${table}`);
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(env.SOURCE_DATABASE_SCHEMA)) throw new Error('SOURCE_DATABASE_SCHEMA contains invalid identifier characters');
  return `"${env.SOURCE_DATABASE_SCHEMA}"."${table}"`;
}
