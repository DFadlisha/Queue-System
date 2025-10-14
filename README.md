# Queue System – Quick Deploy

This app is a Vite + React frontend. For Vercel-only hosting with multi-device sync and no custom server, it uses simple serverless API routes backed by Vercel KV.
You only deploy to Vercel—no separate Node server is required.

## Fastest way to get a live link (Vercel web UI)
1. Push this folder to a GitHub repo (or create one and copy files).
2. Go to https://vercel.com → New Project → Import your repo.
3. Framework Preset: Vite (vercel.json is included, so defaults are already set)
4. Build Command: `npm run build` (pre-filled)
5. Output Directory: `dist` (pre-filled)
6. Environment Variables (Vercel → Settings → Environment Variables):
  - VERCEL_KV_REST_API_URL (auto if you add KV integration)
  - VERCEL_KV_REST_API_TOKEN (auto if you add KV integration)
  - VERCEL_KV_REST_API_READ_ONLY_TOKEN (optional)
7. Deploy → Vercel will give you a live URL like: `https://<project-name>.vercel.app`

Or use the CLI any time:

```bash
npm i -g vercel
vercel --prod
```

> Important: Vercel can’t host a long‑lived WebSocket server in serverless functions. The included API routes use polling + Vercel KV to sync state across devices without any custom server.

No other environment variables are required.

## Backend hosting options
Not needed. The included API routes on Vercel plus KV are enough.

## Dev and local use
- Local dev: `npm run dev` (Vite) and deploy to Vercel with the KV integration enabled.

## Environment
- Only Vercel KV environment variables are required and are added automatically when you enable the KV integration on your Vercel project.

---
If you need, I can set up a minimal Render/Railway config for the backend and give you the `wss://` to paste into Vercel.
