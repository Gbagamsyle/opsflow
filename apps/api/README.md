# Opsflow API

This is the backend for Opsflow, built with NestJS and Prisma. It handles authentication, organization and project management, task workflows, realtime updates, and database access for the Opsflow product.

## Stack

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Clerk authentication hooks
- Socket.IO realtime gateway

## Local setup

From this directory:

```bash
npm install
```

Then start the app in watch mode:

```bash
npm run dev
```

Common commands:

```bash
npm run build
npm run start
npm run test
npm run test:e2e
```

## Database

This project uses Prisma. Configure your database connection through the environment variables expected by the app, then run:

```bash
npx prisma generate
npx prisma migrate dev
```

## Core modules

The API is organized into domain modules such as:

- auth
- users
- organizations
- projects
- clients
- tasks
- activity
- team
- realtime
- webhooks

## Environment variables

Set the required environment values for:

- database connection
- Clerk auth
- webhook verification
- any local service configuration

Keep these values out of version control.

## Notes

This backend is part of a monorepo and is intended to run alongside the Next.js web app in development.
