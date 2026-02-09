import { readdir, readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

try {
  const env = readFileSync(join(__dirname, '../.env'), 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {
  // .env optional
}

async function migrate() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  const migrationsDir = join(__dirname, '../packages/db/src/migrations');
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const name = file.replace('.sql', '');
    const { rows } = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [name]);
    if (rows.length > 0) continue;
    const sql = await readFile(join(migrationsDir, file), 'utf-8');
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
    console.log('Applied:', name);
  }
  await pool.end();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
