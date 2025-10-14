# Queue System – Quick Deploy

This app is a Vite + React frontend. For Vercel-only hosting with multi‑device sync and no custom server, it uses simple Vercel serverless API routes backed by **Upstash for Redis** (serverless Redis via REST). You only deploy to Vercel—no separate Node server or WebSocket server is required.

## Fastest way to get a live link (Vercel web UI)
1. Push this folder to a GitHub repo (or create one and copy files).
2. Go to https://vercel.com → New Project → Import your repo.
3. Framework Preset: Vite (vercel.json is included, so defaults are already set)
4. Build Command: `npm run build` (pre-filled)
5. Output Directory: `dist` (pre-filled)
6. Add the Upstash for Redis integration (Marketplace → search "Upstash" → Install the one named "Upstash for Redis"). Choose your project + the environments (Production & Preview). After install Vercel will inject two env vars automatically:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
   (Nothing else required.)
7. Deploy → Vercel will give you a live URL like: `https://<project-name>.vercel.app`

Or use the CLI any time:

```bash
npm i -g vercel
vercel --prod
```

> Important: Vercel can’t host a long‑lived WebSocket server in serverless functions. The included API routes use lightweight polling + Upstash Redis (REST) to sync state across devices without any custom server.

No other environment variables are required.

## Backend hosting options
Not needed. The included API routes on Vercel plus Upstash Redis are enough.

## Dev and local use
- Local dev: `npm run dev` (Vite). Local development uses an in‑memory fallback so Redis is not required for testing on one machine. For multi‑device testing in production you still need the Upstash integration deployed.

## Environment
- Only the two Upstash Redis variables (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) are required and are added automatically when you enable the integration.

### Which Upstash product do I pick?
From the Vercel Marketplace you will see several Upstash offerings:
- Upstash Search – NOT needed.
- Upstash QStash/Workflow – NOT needed.
- Upstash for Redis – THIS is the one you must install.
- Upstash Vector – NOT needed.

Installing "Upstash for Redis" creates a serverless Redis database and injects the REST URL + token. The code in `api/queue/*.js` reads those env vars and persists the queue state there.

### Verifying after deploy
1. Open your deployed site `/api/queue/state` – you should get JSON with `counters` and `currentNumber` (not a 500 error).
2. Open the Display screen page; the red "Disconnected" banner should vanish after the first successful poll.
3. Use the Counter phone page to Call Next; the Display should announce the number (ensure you tap once to unlock audio if needed).

### Troubleshooting
If `/api/queue/state` returns 500:
- Confirm the integration shows under Vercel Project → Settings → Integrations.
- Check Environment Variables list includes the two Upstash vars for the environment you deployed.
- Trigger a redeploy (press Deploy button or `vercel --prod`).
- If still failing, log the function output in Vercel Logs; likely the env vars were absent at build time.

### Manual (no Marketplace) setup alternative
If the Marketplace screen is confusing or you prefer manual control:
1. Go to https://upstash.com and create a free account (or log in).
2. Create a new Redis database:
  - Pick a region close to you (e.g., `ap-southeast-1` for Malaysia/Singapore).
  - Free plan is enough.
3. In the database details page copy:
  - REST URL (looks like `https://<id>.upstash.io`)
  - REST TOKEN (a long secret string)
4. In Vercel Project → Settings → Environment Variables add:
  - Name: `UPSTASH_REDIS_REST_URL`  Value: (paste REST URL)
  - Name: `UPSTASH_REDIS_REST_TOKEN` Value: (paste REST TOKEN)
  Scope: Production + Preview.
5. Redeploy. Done.

### Local-only (no external database) usage
If you just want it working on one PC + same Wi‑Fi devices (not on the public internet):
1. Run `npm run dev` on a laptop.
2. Other devices on the same network open `http://<laptop-ip>:3000` (e.g. `http://192.168.0.15:3000`).
3. All state lives in memory on that dev server; when you stop it everything resets.
4. You do NOT need any Upstash or env vars for this.

Limitations of local-only mode: data is lost on restart, not accessible outside your LAN, and Vercel deployment won’t sync without Redis.

---
If you ever need a WebSocket push model later, we could add a tiny dedicated Node server; for now the polling + Redis approach meets the original "no extra server" goal.
