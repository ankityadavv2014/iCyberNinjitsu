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
} catch {}

const WORKSPACE_ID = '00000000-0000-0000-0000-000000000002';

const CYBER_SOURCES = [
  // News portals
  { url: 'https://krebsonsecurity.com/feed/', name: 'Krebs on Security', category: 'news' },
  { url: 'https://feeds.feedburner.com/TheHackersNews', name: 'The Hacker News', category: 'news' },
  { url: 'https://www.bleepingcomputer.com/feed/', name: 'BleepingComputer', category: 'news' },
  { url: 'https://www.darkreading.com/rss.xml', name: 'Dark Reading', category: 'news' },
  { url: 'https://www.securityweek.com/feed/', name: 'SecurityWeek', category: 'news' },
  { url: 'https://therecord.media/feed', name: 'The Record', category: 'news' },
  // Threat intelligence / advisories
  { url: 'https://www.cisa.gov/cybersecurity-advisories/all.xml', name: 'CISA Advisories', category: 'threat_intel' },
  { url: 'https://www.us-cert.gov/ncas/alerts.xml', name: 'US-CERT Alerts', category: 'threat_intel' },
  // Leaders / analysis
  { url: 'https://www.sans.org/newsletters/newsbites/rss', name: 'SANS NewsBites', category: 'leader' },
  { url: 'https://www.schneier.com/feed/', name: 'Schneier on Security', category: 'leader' },
  { url: 'https://www.troyhunt.com/rss/', name: 'Troy Hunt', category: 'leader' },
  { url: 'https://grahamcluley.com/feed/', name: 'Graham Cluley', category: 'leader' },
];

async function seed() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  // User + workspace
  await pool.query(`
    INSERT INTO users (id, email, name) VALUES ('00000000-0000-0000-0000-000000000001', 'test@astra.local', 'Test User')
    ON CONFLICT (id) DO NOTHING
  `).catch(() => {});
  await pool.query(`
    INSERT INTO workspaces (id, name, owner_id) VALUES ($1, 'Default', '00000000-0000-0000-0000-000000000001')
    ON CONFLICT (id) DO NOTHING
  `, [WORKSPACE_ID]).catch(() => {});

  // Cybersecurity RSS sources
  let added = 0;
  for (const src of CYBER_SOURCES) {
    const config = JSON.stringify({ url: src.url, name: src.name, category: src.category });
    const { rowCount } = await pool.query(
      `INSERT INTO sources (workspace_id, type, config, enabled)
       SELECT $1, 'rss', $2::jsonb, true
       WHERE NOT EXISTS (
         SELECT 1 FROM sources WHERE workspace_id = $1 AND config->>'url' = $3
       )`,
      [WORKSPACE_ID, config, src.url]
    ).catch(() => ({ rowCount: 0 }));
    if (rowCount && rowCount > 0) added++;
  }

  console.log(`Seed done. Added ${added} cybersecurity sources (${CYBER_SOURCES.length - added} already existed).`);
  console.log('Use Authorization: Bearer 00000000-0000-0000-0000-000000000001');
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
