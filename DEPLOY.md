# Deploying Astra

## 1. Push to GitHub

From your machine (repo root):

```bash
# If you haven't already: create a new repo on GitHub
# https://github.com/new → name it e.g. "Astra" (or "astra"), leave it empty (no README/license).

git remote add origin https://github.com/ankityadavv2014/Astra.git
git branch -M main
git push -u origin main
```

Replace `Astra` with your actual repo name if different. Use SSH if you prefer: `git@github.com:ankityadavv2014/Astra.git`.

---

## 2. Deploy frontend (Next.js) on Vercel

[Vercel](https://vercel.com) is recommended for the Next.js app (fast, free tier, automatic previews).

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Import** your repo: `ankityadavv2014/Astra`.
3. **Root Directory:** set to **`apps/web`** (so Vercel builds the Next.js app).
4. **Framework Preset:** Next.js (auto-detected).
5. **Environment variables** (add in Vercel project → Settings → Environment Variables):
   - `NEXT_PUBLIC_API_URL` = your **backend API URL** (see step 3 below).  
     For local backend: `http://localhost:4000`. For production, use your API host URL (e.g. `https://your-api.railway.app`).
6. Deploy. Vercel will run `npm install` and `npm run build` inside `apps/web`.

Your app will be live at `https://your-project.vercel.app`. The dashboard will call the API from `NEXT_PUBLIC_API_URL`; if the API is not deployed yet, set it later and redeploy.

---

## 3. Backend (API + Worker + DB)

The web app needs the **API** running somewhere. Optionally you run the **worker** (ingest/generate/publish) and need **Postgres** and **Redis**.

Options:

| Service | Use case |
|--------|----------|
| **Railway** | Easiest: one project for API + Worker + Postgres + Redis. Connect repo, add services, set env vars. |
| **Render** | Free tier: deploy API as Web Service; add Postgres and Redis; worker as Background Worker. |
| **Fly.io** | Deploy API and worker as apps; use Upstash Redis and Neon/Supabase Postgres. |

**Required env for API (and worker):**  
`DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_KEY`, and optionally `ANTHROPIC_API_KEY`, LinkedIn OAuth vars. See root `.env.example`.

After the API is deployed, set **`NEXT_PUBLIC_API_URL`** in Vercel to that URL and redeploy the frontend.

---

## 4. Summary

| What | Where |
|------|--------|
| **Code** | GitHub: `https://github.com/ankityadavv2014/<repo-name>` |
| **Frontend** | Vercel (root directory: `apps/web`), env: `NEXT_PUBLIC_API_URL` |
| **API + Worker + DB** | Railway / Render / Fly.io (or similar); then point Vercel at the API URL |
