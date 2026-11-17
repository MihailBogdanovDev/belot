# Белот (Belot)

Online Bulgarian Belot for four friends, each on their own device. One shared table, four seats, real-time play in the browser (React + Socket.IO), and a rules engine that runs on the server.

- Rules reference: [docs/rules.md](docs/rules.md)
- House rule: no reshuffle. Cards are gathered in a fixed order, cut and dealt again (details in the rules doc).

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. To test alone, open four tabs with `?slot=1` .. `?slot=4` (for example `http://localhost:5173/?slot=2`); each slot keeps its own identity, so every tab is a separate player. Add `?bot=1` to a tab (dev only) to make it auto-play random legal moves.

## Production

```bash
npm run build && npm start
```

The server listens on `PORT` (default `3001`) and serves the built client, so one process is all you need: <http://localhost:3001>.

## Docker

```bash
docker build -t belot .
docker run -p 3001:3001 belot
```

## Playing with friends

Everyone needs to reach the same server, so it must be on a public host or behind a tunnel (for example ngrok or Cloudflare Tunnel). Share the URL and each friend picks a seat.

Hosting needs a **persistent Node process with WebSocket support**, such as Fly.io, Render or Railway (the Docker image works on all of them). Vercel-style serverless hosting does not fit, because the game state lives in server memory and Socket.IO needs long-lived connections.

### Live: <https://belot.fly.dev>

Deployed on Fly.io with [`fly.toml`](fly.toml):

- **Exactly one machine.** The table lives in that machine's memory; a second machine would be a second, separate table. Never scale above 1.
- **Port 3001** (`internal_port` and `PORT` must match).
- **Auto-stop** when nobody is connected, auto-start on the next visit (a few seconds' delay). Stopping, restarting or redeploying ends any game in progress.

Redeploy after changes:

```bash
fly deploy --ha=false
```

Check status and logs: `fly status`, `fly logs`.

## Tests

```bash
npm test
```
