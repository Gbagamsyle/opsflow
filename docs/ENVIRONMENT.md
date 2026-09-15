# Environment and deployment

## Local development

Requirements:

- Node.js 22 or newer
- PostgreSQL 16 or newer
- A Clerk development instance

Install dependencies:

```bash
npm install
npm --prefix apps/api install
npm --prefix apps/web install
```

Create the local environment files:

```bash
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Set these values before starting the apps:

| App | Variable | Purpose |
| --- | --- | --- |
| API | `DATABASE_URL` | PostgreSQL connection used by Prisma |
| API | `CLERK_SECRET_KEY` | Verifies Clerk API and realtime tokens |
| API | `PORT` | Optional HTTP port, defaults to `4000` |
| Web | `NEXT_PUBLIC_API_URL` | Browser-facing API origin |
| Web | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser authentication key |

Initialize the database and start the apps:

```bash
npm --prefix apps/api exec prisma -- migrate deploy --config apps/api/prisma.config.ts
npm run dev
```

The web app is normally available at `http://localhost:3000`; the API is normally available at `http://localhost:4000`.

## Release checks

Run the same checks used by CI:

```bash
npm run lint:api
npm run ci:smoke
npx playwright install chromium
npm run e2e
```

The browser smoke suite checks public sign-in, sign-up, and dashboard entry navigation. It does not attempt to sign in with a real account, so it does not require credentials in the test runner.

## Deployment

Deploy the API and web app as separate services.

API release steps:

1. Install dependencies with `npm ci`.
2. Set `DATABASE_URL` and `CLERK_SECRET_KEY` as platform secrets.
3. Run `npm --prefix apps/api exec prisma -- migrate deploy --config apps/api/prisma.config.ts` during the release.
4. Run `npm run build`.
5. Start with `npm run start:prod`.
6. Expose the health endpoint at `GET /` for platform checks.

Web release steps:

1. Install dependencies with `npm ci`.
2. Set `NEXT_PUBLIC_API_URL` to the public API origin.
3. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` for the same Clerk instance used by the API.
4. Run `npm run build`.
5. Start with `npm run start`.

Configure the API CORS origin and Clerk allowed origins to match the deployed web URL. Keep the API and web URLs on HTTPS in production, and store all secret values in the deployment platform rather than in the repository.

## CI requirements

The GitHub Actions workflow uses PostgreSQL 16 and expects these repository secrets for the web build and API runtime:

- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
