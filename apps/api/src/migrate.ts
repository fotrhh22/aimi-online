import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import './config.js';
import { createPool } from './db.js';

const connection = process.env.MIGRATION_DATABASE_URL;
if (!connection) throw new Error('MIGRATION_DATABASE_URL is required; runtime credentials are not used for DDL');
const pool = createPool(connection);
const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(hashtext('aimi-migrations'))");
  await client.query('CREATE SCHEMA IF NOT EXISTS aimi');
  await client.query('CREATE TABLE IF NOT EXISTS aimi.schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const folder = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));
  for (const name of (await readdir(folder)).filter(n => n.endsWith('.sql')).sort()) {
    const sql = await readFile(folder + name, 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const existing = await client.query('SELECT checksum FROM aimi.schema_migrations WHERE name=$1', [name]);
    if (existing.rowCount) {
      if (existing.rows[0].checksum !== checksum) throw new Error('Applied migration checksum mismatch: ' + name);
      console.log('Unchanged migration: ' + name);
      continue;
    }
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO aimi.schema_migrations(name,checksum) VALUES ($1,$2)', [name, checksum]);
      await client.query('COMMIT');
      console.log('Applied migration: ' + name);
    } catch {
      await client.query('ROLLBACK');
      throw new Error('Migration failed: ' + name + ' (database detail suppressed)');
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock(hashtext('aimi-migrations'))");
  client.release();
  await pool.end();
}
