import pg from 'pg';
import { readFileSync } from 'node:fs';
const supabaseCA = readFileSync(new URL('../certs/supabase-ca.crt', import.meta.url), 'utf8');
export function createPool(connectionString: string) {
  const url = new URL(connectionString);
  const local = ['localhost','127.0.0.1','::1','[::1]'].includes(url.hostname);
  // Explicit TLS settings take precedence over URL options; remote verification stays enabled.
  for (const key of ['sslmode','sslcert','sslkey','sslrootcert']) url.searchParams.delete(key);
  const pool = new pg.Pool({ connectionString: url.toString(), ssl: local ? false : { rejectUnauthorized: true, ca: supabaseCA }, max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000, statement_timeout: 10000 });
  pool.on('error', () => { console.error('Database pool connection error'); });
  return pool;
}
export class ApiError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
