import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { loadEnv } from '../lib/env-loader';

loadEnv();

async function apply() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const password = process.env.PASSWORD;
  
  if (!url || !password) {
    throw new Error('Supabase URL or password missing in .env.local');
  }

  const projectRef = url.match(/https:\/\/(.+)\.supabase\.co/)?.[1];
  if (!projectRef) throw new Error('Could not parse project ref from URL');

  const sql = postgres(`postgres://postgres.${projectRef}:${password}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`);
  
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20261121204500_eval_score_c.sql');
  const migration = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration...');
  await sql.unsafe(migration);
  console.log('Migration applied successfully.');

  process.exit(0);
}

apply().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
