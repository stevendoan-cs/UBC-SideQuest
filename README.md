# UBC SideQuest

Make new friends at UBC through spontaneous, low-pressure campus quests. Sign in, set your interests, join the queue, get matched with another student, and complete the same AI-generated quest together.

## Repository layout

| Folder | What | Owner | Start here |
| --- | --- | --- | --- |
| [`frontend/`](frontend/) | Web app (Lovable, TanStack Start + React) | Person 1 | `cd frontend && bun install && bun run dev` |
| [`backend/`](backend/) | REST API: profiles, matchmaking, quests, Auth0, n8n events (Node + SQLite) | Person 2 | [backend/README.md](backend/README.md) |
| [`ai-agent/`](ai-agent/) | Quest generation service (Python) | Person 3 | `cd ai-agent && pip install -r requirements.txt && python start.py` |

Auth0 and n8n configuration (Person 4) plug into the backend via environment variables. See [backend/README.md](backend/README.md) §6 and §8.

## How the pieces connect

```
frontend ──(Auth0 access token)──▶ backend ──▶ ai-agent   (MARITIME_AGENT_URL)
                                      │
                                      └──▶ n8n webhook     (N8N_WEBHOOK_URL)
```

Each folder is independent: its own dependencies, config, and `.gitignore`. Run commands from inside the folder.

## Frontend ↔ backend

The frontend signs users in with Auth0 (Universal Login) and calls the backend with the Auth0 access token. Public defaults live in [`frontend/src/lib/config.ts`](frontend/src/lib/config.ts): API `https://45-32-230-78.sslip.io`, Auth0 tenant, client ID and audience. Override any of them with `VITE_API_URL`, `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID` or `VITE_AUTH0_AUDIENCE`.

The Auth0 application (Single Page Application) must allow each frontend URL:

- **Allowed Callback URLs:** `<frontend-url>/callback`, e.g. `http://localhost:8080/callback`
- **Allowed Logout URLs** and **Allowed Web Origins:** `<frontend-url>`, e.g. `http://localhost:8080`

The backend's `CORS_ORIGINS` must include the same frontend URLs.

**Local full-stack testing without Auth0:**

```sh
# terminal 1: backend in dev-auth mode
cd backend && AUTH_MODE=dev NODE_ENV=development npm run dev
# terminal 2: frontend pointing at it
cd frontend && VITE_AUTH_MODE=dev VITE_API_URL=http://localhost:3000 npx vite dev --port 8080
```

Sign in with any test name (e.g. `alice` in one browser and `bob` in a private window) to try matching. Dev mode is ignored in production builds.
