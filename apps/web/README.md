# Opsflow Web

This is the frontend for Opsflow, built with Next.js and designed around the product and dashboard patterns described in [../../DESIGN.md](../../DESIGN.md).

## Stack

- Next.js
- React
- TypeScript
- Clerk auth
- Socket.IO client
- CSS Modules and route-scoped styling

## Local setup

From this directory:

```bash
npm install
npm run dev
```

The app defaults to the standard Next.js local development URL:

- http://localhost:3000

## Main app structure

- app/auth: authentication entry flow
- app/dashboard: workspace and operational dashboard views
- src/hooks: client-side state and realtime hooks
- src/lib: shared utilities and client helpers

## Working with the dashboard

The dashboard is the primary product experience and should stay aligned with the design system in [../../DESIGN.md](../../DESIGN.md). Keep navigation, data states, spacing, and controls consistent with the product language.

## Environment variables

Set any required local environment keys for Clerk and the backend API URL, such as:

- NEXT_PUBLIC_API_URL
- Clerk public configuration values

Do not commit local environment files.

## Notes

This frontend is meant to run with the API app in the same workspace during local development.
