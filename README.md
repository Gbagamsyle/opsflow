# Opsflow

Opsflow is a workspace and operations platform for client work, project delivery, and team coordination. The product combines a project dashboard, client records, task tracking, and realtime activity updates into a single operational workspace.

## Overview

- API: NestJS + Prisma + PostgreSQL
- Web app: Next.js + React + Clerk authentication
- Design system: documented in [DESIGN.md](DESIGN.md)
- Monorepo structure: root scripts for running both apps together

## Repository layout

- [apps/api](apps/api): backend service and Prisma database layer
- [apps/web](apps/web): frontend dashboard and client experience
- [DESIGN.md](DESIGN.md): product design system and interface rules

## Quick start

Install dependencies at the repo root and in each app:

```bash
npm install
npm --prefix apps/api install
npm --prefix apps/web install
```

Run both apps in development mode:

```bash
npm run dev
```

Or run them individually:

```bash
npm run dev:api
npm run dev:web
```

## Local development

### API

Copy `apps/api/.env.example` to `apps/api/.env` and set a PostgreSQL connection plus a Clerk secret key.

```bash
cd apps/api
npm install
npm run dev
```

The API runs on the configured NestJS development server, typically on port 4000 unless your environment overrides it.

### Web app

Copy `apps/web/.env.example` to `apps/web/.env.local` and set the API origin plus Clerk publishable key.

```bash
cd apps/web
npm install
npm run dev
```

The web app runs on the default Next.js port, usually http://localhost:3000.

## Environment setup

The complete local and deployment checklist is in [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md). Never commit `.env` or `.env.local` files or secret values.

## Design and product guidance

The shared product and visual rules live in [DESIGN.md](DESIGN.md). Any new screen or workflow should follow that document so the workspace, dashboard, and product surfaces remain consistent.

## Scripts

From the repo root:

- `npm run dev` — start API + web together
- `npm run dev:api` — start only the backend
- `npm run dev:web` — start only the frontend
- `npm run ci:smoke` — build the API and web apps and run API tests
- `npm run e2e` — run Playwright browser smoke checks against the web app
- `npm run lint:api` — run API ESLint checks

## Status

This repository is currently under active product development. The app structure is in place, but the repo should be kept tidy and the documentation should match the project rather than default starter templates.
