# Golax Prospect AI OS

AI-powered prospect research platform. Discover businesses, audit their websites
(technical, SEO, conversion), score opportunities, and generate personalized
outreach drafts — so agencies/freelancers can find and contact clients fast.

> Version 1: research + drafts only. No automatic email sending.

## Tech Stack

| Layer        | Tech                                   |
| ------------ | -------------------------------------- |
| Frontend     | Next.js 15, TypeScript, Tailwind, Shadcn UI |
| Backend API  | Node.js, Express.js                    |
| Worker       | Node.js + pg-boss (Postgres queue, no Redis) |
| Database     | PostgreSQL + Prisma ORM                |
| Automation   | Playwright                             |
| Auditing     | Lighthouse                             |
| AI           | Google Gemini API                      |
| Search       | Serper API                             |
| Auth         | JWT + Refresh Tokens                   |

## Monorepo Layout

```
golax-os/
├── apps/
│   ├── web/        # Next.js 15 dashboard
│   └── api/        # Express REST API + auth
├── packages/
│   ├── db/         # Prisma schema + client (@golax/db)
│   └── worker/     # Background agent pipeline (@golax/worker)
├── docker-compose.yml
└── .env.example
```

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Fill DATABASE_URL, JWT secrets, SERPER_API_KEY, GEMINI_API_KEY
```

### 3. Start PostgreSQL

Option A — Docker (if installed):

```bash
docker compose up -d
```

Option B — No Docker: create a free Postgres on
[Neon](https://neon.tech) or [Supabase](https://supabase.com) and paste the
connection string into `DATABASE_URL`.

### 4. Run migrations

```bash
pnpm db:migrate
pnpm db:generate
```

### 5. Run the apps

```bash
pnpm dev          # runs web + api
pnpm dev:worker   # runs the background worker
```

- Web:    http://localhost:3000
- API:    http://localhost:4000

## Build Phases

- [x] Phase 0 — Monorepo, Prisma schema, env
- [x] Phase 1 — Auth (JWT + refresh)
- [x] Phase 2 — Projects CRUD + dashboard shell
- [x] Phase 3 — Worker + Lead Discovery (Serper)
- [x] Phase 4 — Website/Contact/Technical/SEO/Conversion audits
- [x] Phase 5 — Scoring, Recommendation, AI analysis, Outreach
- [x] Phase 6 — Results dashboard, export, stats, logs

> Worker browser setup (one-time, for Playwright/Lighthouse):
>
> ```bash
> pnpm --filter @golax/worker browser:install
> ```

## How It Runs Without API Keys

- **No `SERPER_API_KEY`** → Lead Discovery uses deterministic mock businesses so
  the full pipeline works end-to-end for development.
- **No `GEMINI_API_KEY`** → AI Analysis + Outreach fall back to rule-based
  templates (still personalized from audit data).

Add the real keys to `.env` to switch to live data.

## VPS Deployment (PM2)

On the server (Linux):

```bash
# 1. Install deps
pnpm install

# 2. Configure environment
cp .env.example .env   # then edit DATABASE_URL, JWT secrets, API keys, CORS_ORIGIN

# 3. Apply DB schema (uses prisma migrate deploy)
pnpm db:migrate:deploy
pnpm db:generate

# 4. Install the headless browser for the worker
pnpm --filter @golax/worker browser:install

# 5. Build the frontend
pnpm --filter @golax/web build

# 6. Start all 3 processes with PM2
pm2 start ecosystem.config.cjs
pm2 save
```

This runs `golax-api`, `golax-worker`, and `golax-web`. Put Nginx in front to
route your domain to the web (`:3000`) and `/api` to the API (`:4000`), and set
`NEXT_PUBLIC_API_URL` / `CORS_ORIGIN` to your public URLs.

## API Endpoints

| Method | Path                          | Description                |
| ------ | ----------------------------- | -------------------------- |
| POST   | `/api/auth/register`          | Create account             |
| POST   | `/api/auth/login`             | Sign in                    |
| POST   | `/api/auth/refresh`           | Rotate tokens              |
| POST   | `/api/auth/logout`            | Revoke refresh token       |
| POST   | `/api/auth/forgot-password`   | Request reset token        |
| POST   | `/api/auth/reset-password`    | Reset with token           |
| GET    | `/api/auth/me`                | Current user               |
| POST   | `/api/auth/change-password`   | Change password            |
| GET/POST | `/api/projects`             | List / create projects     |
| GET/DELETE | `/api/projects/:id`       | Get / delete project       |
| POST   | `/api/projects/:id/start`     | Start research pipeline    |
| GET    | `/api/projects/:id/progress`  | Pipeline progress          |
| GET    | `/api/companies`              | Results (search/filter/page) |
| GET    | `/api/companies/:id`          | Full company detail        |
| GET    | `/api/companies/export`       | CSV / XLSX export          |
| GET    | `/api/stats`                  | Dashboard statistics       |
| GET    | `/api/logs`                   | Activity logs              |
