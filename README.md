# Queue System – Quick Deploy

This app is a Vite + React frontend with a Node + WebSocket backend (`server.js`). You can:
- Host the frontend on Vercel (static site)
- Point it to any public WebSocket server using `VITE_WS_URL`

## Fastest way to get a live link (Vercel web UI)
1. Push this folder to a GitHub repo (or create one and copy files).
2. Go to https://vercel.com → New Project → Import your repo.
3. Framework Preset: Vite
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variables (Add):
   - Key: `VITE_WS_URL`
   - Value: `wss://your-public-ws-host` (no trailing slash). If you’re testing on local Wi‑Fi only, you can use `ws://192.168.x.x:3001` but the site will only work for devices on the same network.
7. Deploy → Vercel will give you a live URL like: `https://<project-name>.vercel.app`

> Important: Vercel can’t host a long‑lived WebSocket server in serverless functions. Keep `server.js` on your laptop (LAN) or deploy the backend to a host that supports Node processes (Render/Railway/Fly). Then set `VITE_WS_URL` to that public host.

## Optional: Deploy with Vercel CLI
```bash
# Install once
npm i -g vercel
# From project folder (first run will ask a few questions)
vercel
# For production
vercel --prod
```
Remember to add `VITE_WS_URL` in the Vercel project settings (Environment Variables) before the production deploy.

## Backend hosting options (for public access)
- Render/Railway/Fly.io: Run `node server.js` 24/7
- Cloudflare Tunnel or ngrok: Expose your local port 3001 to the internet (get a public `wss://` URL). Then set `VITE_WS_URL` to that URL.

## Dev and local use
- Start backend + serve built frontend:
  ```bash
  npm start
  ```
- Open: `http://localhost:3001/admin` and `http://localhost:3001/display`

## Environment
- See `.env.example` and set `VITE_WS_URL` in Vercel.

---
If you need, I can set up a minimal Render/Railway config for the backend and give you the `wss://` to paste into Vercel.
