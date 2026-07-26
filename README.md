# Seichi Pilgrimage App

Responsive web app foundation for managing anime pilgrimage scenes, trips, field photo binding, and review workflows.

Phase 0 is an engineering harness only. It intentionally does not implement Scene, Work, Location, Trip, photo upload, Google APIs, or map features.

## Requirements

- Node.js 20.13.1 or newer compatible Node 20 release
- npm 10+
- Docker Desktop

## Setup

```bash
npm ci
docker compose up -d
npm run db:reset
npm run prepare:e2e
npm run verify
```

## Development

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Verification

The canonical local and CI verification command is:

```bash
npm run verify
```

It runs format check, lint, typecheck, unit tests, test database reset, integration tests, production build, and Playwright E2E tests.

## Database

Local PostgreSQL runs through Docker Compose.

Default development URL:

```text
postgresql://seichi:seichi_dev_password@localhost:5432/seichi_dev?schema=public
```

Default test URL:

```text
postgresql://seichi:seichi_dev_password@localhost:5432/seichi_test?schema=public
```

Copy `.env.example` to `.env` only if you need to override the defaults. Never commit `.env`.

## Phase Workflow

Each phase is planned, implemented, verified, and committed as one focused phase commit. Blocks are still used for planning and acceptance, but Phase 0 adopts the project rule that commits happen after the full phase passes verification.
