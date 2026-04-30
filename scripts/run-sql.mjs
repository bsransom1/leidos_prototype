#!/usr/bin/env node
/**
 * Apply a .sql file to Postgres using DATABASE_URL (Session/pool mode URI works).
 *
 * Dashboard: Project Settings → Database → URI (paste password once).
 *
 * Usage:
 *   node --env-file=.env.local scripts/run-sql.mjs supabase/migrations/20260130120000_leidos_full_schema.sql
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DATABASE_URL =
  process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, '') || '';

const arg = process.argv[2];
if (!arg || !DATABASE_URL) {
  console.error('Usage (requires DATABASE_URL in .env.local):');
  console.error('  node --env-file=.env.local scripts/run-sql.mjs <path-to-file.sql>');
  console.error('');
  console.error(
    'Set DATABASE_URL from Supabase → Settings → Database (connection string, session mode recommended).',
  );
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), arg);
if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath);
  process.exit(1);
}

const sql = fs.readFileSync(filePath, 'utf8');
const pg = await import('pg');

const client = new pg.default.Client({
  connectionString: DATABASE_URL,
  ssl:
    DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(sql);
  console.log('OK applied:', path.relative(process.cwd(), filePath));
} finally {
  await client.end();
}
