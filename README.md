# CI/CD Pipeline Dashboard

A developer-facing dashboard that connects to the GitHub API and displays CI/CD pipeline health across multiple repositories in real time.

## Features

- **Main Dashboard** — Enter any GitHub username to load all their public repos. Each card shows the last workflow run status, success rate (last 30 runs), and average build duration. Auto-refreshes every 30 seconds. Filter by All / Passing / Failing.
- **Health Overview** — Aggregated stats across all loaded repos: total repos, overall success rate, total runs, repos with >40% failure rate highlighted.
- **Repo Detail Page** — Line chart of daily success/failure counts, bar chart of average job durations, table of last 20 runs, and the most-failing job name.

## Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- [Recharts](https://recharts.org/) for charts
- GitHub REST API (no auth required for public repos)

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. (Optional) Add a GitHub token for higher rate limits

Without a token the GitHub API allows 60 requests/hour per IP. With a token you get 5,000 requests/hour.

```bash
cp .env.local.example .env.local
# Then edit .env.local and paste your token:
# GITHUB_TOKEN=ghp_...
```

Create a token at <https://github.com/settings/tokens> — no special scopes are needed for public repos.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for production

```bash
npm run build
npm start
```

## Usage

1. Type a GitHub username in the search box and press **Load Repos**.
2. The dashboard fetches all public repositories and loads their GitHub Actions stats.
3. Click any repo card to open the detail page with charts and a full run history.

## API Routes

| Route | Description |
|---|---|
| `GET /api/repos?username=X` | Lists public repos for a GitHub user |
| `GET /api/workflows?owner=X&repo=Y` | Returns workflow run stats (success rate, avg duration, last run) |
| `GET /api/workflows?owner=X&repo=Y&detail=true` | Returns full stats including daily chart data and per-job durations |

All GitHub API calls are proxied through these Next.js API routes — the GitHub token stays server-side.
