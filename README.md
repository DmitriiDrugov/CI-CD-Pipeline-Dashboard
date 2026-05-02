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
| `GET /api/workflow-stats?username=X` | Aggregated per-repo stats for all repos of a user (see Azure section below) |

All GitHub API calls are proxied through these Next.js API routes — the GitHub token stays server-side.

---

## Azure Serverless Backend

### Architecture decision

The `/api/workflow-stats` route aggregates workflow data across **all** repos of a GitHub user in a single call. Running this fan-out (up to 100 repos × GitHub API requests) inside a Next.js serverless function is fine for small accounts but can approach Vercel's 10 s execution limit for larger ones. The Azure Function offloads that work to a dedicated, independently scalable compute unit with its own timeout budget (up to 10 min on Consumption plan).

```
Browser → Next.js /api/workflow-stats → (toggle) ──┬── GitHub API (local path)
                                                    └── Azure Function → GitHub API
```

The toggle is a server-side env flag so switching backends requires no code or UI changes.

### Project structure

```
azure-functions/
  host.json                        # Azure Functions v4 host config
  package.json                     # deps: @azure/functions, applicationinsights
  tsconfig.json
  local.settings.json.example      # copy → local.settings.json for local dev
  src/
    functions/
      getWorkflowStats.ts          # HTTP trigger: GET /api/getWorkflowStats?username=X
    utils/
      githubClient.ts              # typed GitHub REST API client
      aggregator.ts                # pure aggregation logic (testable in isolation)
```

### Local development

**Prerequisites:** [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-local) and Node.js 20.

```bash
cd azure-functions
cp local.settings.json.example local.settings.json
# Edit local.settings.json and fill in GITHUB_TOKEN (and optionally APPLICATIONINSIGHTS_CONNECTION_STRING)

npm install
npm run dev          # compiles TypeScript then runs: func start
```

The function listens on `http://localhost:7071/api/getWorkflowStats?username=<github_username>`.

To test the Next.js integration locally, add these to `.env.local`:

```bash
USE_AZURE_BACKEND=true
AZURE_FUNCTION_URL=http://localhost:7071
```

### Deploying to Azure

1. Create a Function App in the Azure Portal (Node.js 20, Consumption plan).
2. Set the application settings `GITHUB_TOKEN` and `APPLICATIONINSIGHTS_CONNECTION_STRING`.
3. From the `azure-functions/` directory:

```bash
npm run build
AZURE_FUNCTION_APP_NAME=your-function-app-name npm run deploy
```

4. Copy the Function App URL (e.g. `https://your-function-app-name.azurewebsites.net`) and update your Vercel project's env vars:

```
USE_AZURE_BACKEND=true
AZURE_FUNCTION_URL=https://your-function-app-name.azurewebsites.net
```

### Switching backends

| `USE_AZURE_BACKEND` | `AZURE_FUNCTION_URL` | Behaviour |
|---|---|---|
| `false` (default) | — | Next.js computes aggregation locally via GitHub API |
| `true` | set | Next.js proxies `/api/workflow-stats` to the Azure Function |
| `true` | unset | Returns HTTP 500 with a descriptive error |

### Observability (Application Insights)

When `APPLICATIONINSIGHTS_CONNECTION_STRING` is set, the Azure Function emits:

| Telemetry | Trigger |
|---|---|
| `trackRequest` — name `GET getWorkflowStats` | Every invocation (success **and** failure), includes `username`, `repoCount`, response time |
| `trackEvent` — name `GitHubRateLimitHit` | Whenever GitHub returns 429 or 403 with `X-RateLimit-Remaining: 0`, includes `username`, `endpoint`, and `repo` |
| `trackException` | Any unhandled error |

The connection string is read from the `APPLICATIONINSIGHTS_CONNECTION_STRING` environment variable, which Azure Functions also uses for its own built-in integration — no duplicate SDKs required.
