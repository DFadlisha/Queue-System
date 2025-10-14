# Queue System – Quick Deploy

This app is a Vite + React frontend. For Vercel-only hosting with multi-device sync and no custom server, it now uses simple serverless API routes backed by Vercel KV. You can:
- Host everything on Vercel (frontend + API)
- (Legacy) Use your own Node + WebSocket backend (`server.js`) for LAN-only mode

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
  - Legacy WebSocket backend (optional): `VITE_WS_URL = wss://your-public-ws-host` (or `ws://192.168.x.x:3001` for LAN). If set, you can still run the old Node backend.
7. Deploy → Vercel will give you a live URL like: `https://<project-name>.vercel.app`

Or use the CLI any time:

```bash
npm i -g vercel
vercel --prod
```

> Important: Vercel can’t host a long‑lived WebSocket server in serverless functions. The included API routes use polling + Vercel KV to sync state across devices without any custom server.

Remember to add `VITE_WS_URL` in the Vercel project settings (Environment Variables) before the production deploy.

## Backend hosting options (for public access)
- Render/Railway/Fly.io: Run `node server.js` 24/7
- Cloudflare Tunnel or ngrok: Expose your local port 3001 to the internet (get a public `wss://` URL). Then set `VITE_WS_URL` to that URL.

## Dev and local use
- Serverless mode: `npm run dev` (local) and deploy to Vercel with the KV integration enabled.
- Legacy backend mode:
  - Start backend + serve built frontend:
    ```bash
    npm start
    ```
  - Open: `http://localhost:3001/admin` and `http://localhost:3001/display`

## Environment
- See `.env.example` and set KV env on Vercel or `VITE_WS_URL` for legacy backend.

---
If you need, I can set up a minimal Render/Railway config for the backend and give you the `wss://` to paste into Vercel.
