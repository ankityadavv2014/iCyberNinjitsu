import { Pool } from 'pg';
import type { QueryResultRow } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

export function getPool(): Pool {
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const res = await pool.query<T>(text, params);
  return { rows: res.rows, rowCount: res.rowCount ?? 0 };
}

export function getClient() {
  return pool.connect();
}
