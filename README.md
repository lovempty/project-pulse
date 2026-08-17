# ProjectPulse

ProjectPulse is a project-management SaaS interface for startup teams. It connects to the ProjectPulse Fastify API for workspace dashboards, projects, tasks, team workload, analytics, and AI-assisted project insights.

## Local development

The frontend expects the API at `http://localhost:3001` by default.

```bash
copy .env.example .env
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The development experience automatically authenticates with the API's seeded demo account.

Available checks:

```bash
npm run lint
npm run build
```

## Application structure

```text
app/
  (dashboard)/           Shared App Router layout and product routes
  components/
    features/            Domain screens grouped by feature
    layout/              Persistent application shell
    tasks/               Task-specific shared components
    ui/                  Reusable visual primitives
  lib/                   API client, types, and formatting utilities
  providers/             Authenticated workspace state and mutations
```

Product routes:

- `/overview`
- `/projects`
- `/tasks`
- `/board`
- `/team`
- `/analytics`
- `/assistant`

The root route redirects to `/overview`. The dashboard route group preserves the application shell and provider state during client-side navigation.

## Environment

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Only public browser configuration belongs in frontend environment variables. Backend credentials and API keys must remain in the Fastify service.
