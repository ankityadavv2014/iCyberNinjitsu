#!/usr/bin/env node
/**
 * Create GitHub repo (if missing) and push main. Uses GITHUB_TOKEN from .env.github or env.
 * Usage: node --import tsx scripts/github-create-and-push.ts [repo-owner] [repo-name]
 * Example: node --import tsx scripts/github-create-and-push.ts ankityadavv2014 iCyberNinjitsu
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function getToken(): string {
  const fromEnv = process.env.GITHUB_TOKEN;
  if (fromEnv) return fromEnv.trim();
  const envFile = join(ROOT, '.env.github');
  if (existsSync(envFile)) {
    const content = readFileSync(envFile, 'utf-8');
    const line = content.split('\n').find((l) => l.startsWith('GITHUB_TOKEN='));
    if (line) return line.replace(/^GITHUB_TOKEN=/, '').trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('No GITHUB_TOKEN. Add to .env.github: GITHUB_TOKEN=ghp_xxxx (repo scope)');
}

async function createRepo(token: string, owner: string, name: string): Promise<boolean> {
  const res = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description: 'LinkedIn social media automation: Research → Write → Approvals → Schedule → Post.',
      private: false,
      auto_init: false,
    }),
  });
  if (res.status === 201) {
    console.log(`Created repo https://github.com/${owner}/${name}`);
    return true;
  }
  const text = await res.text();
  if (res.status === 422 && text.includes('name already exists')) {
    console.log(`Repo ${owner}/${name} already exists.`);
    return false;
  }
  throw new Error(`GitHub API ${res.status}: ${text}`);
}

function push(token: string, owner: string, name: string): void {
  const remote = `https://${token}@github.com/${owner}/${name}.git`;
  execSync(`git remote set-url origin ${remote}`, { cwd: ROOT, stdio: 'inherit' });
  execSync('git push -u origin main', { cwd: ROOT, stdio: 'inherit' });
  console.log(`Pushed to https://github.com/${owner}/${name}`);
}

async function main() {
  const owner = process.argv[2] ?? 'ankityadavv2014';
  const name = process.argv[3] ?? 'iCyberNinjitsu';
  const token = getToken();
  await createRepo(token, owner, name);
  push(token, owner, name);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
