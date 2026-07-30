# Seichi Pilgrimage App

Responsive web app for managing anime pilgrimage scenes, trips, field photo binding, and review workflows.

Phase 3 currently provides a CSV scene import flow, a no-external-API scene map, and a demo scene catalog backed by Prisma and PostgreSQL. It intentionally does not yet implement trips, photo upload, Google APIs, or review workflows.

## Requirements

- Node.js 20.13.1 or newer compatible Node 20 release
- npm 10+
- Docker Desktop

## Setup

```bash
npm ci
npm run infra:up
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

The Phase 2 scene import page is available at:

```text
http://localhost:3000/imports/scenes
```

The Phase 3 map and navigation page is available at:

```text
http://localhost:3000/map
```

The scene catalog is available at:

```text
http://localhost:3000/scenes
```

Scene Import CSV v1 uses:

```text
scene_code,work_name,work_short_code,episode,anime_drive_file_id,location_name,area_name,latitude,longitude,maps_url,notes
```

`scene_code`, `work_name`, `work_short_code`, `anime_drive_file_id`, `location_name`, `area_name`, `latitude`, and `longitude` are required. Values containing commas must be quoted as standard CSV.

The Phase 3 map uses local coordinate projection and generated Google Maps navigation URLs. It does not require Google Maps JavaScript, API keys, OAuth, or external map tiles.

## Verification

The canonical local and CI verification command is:

```bash
npm run verify
```

It runs format check, lint, typecheck, unit tests, test database reset, integration tests, production build, and Playwright E2E tests.

## Database

Local PostgreSQL runs through Docker Compose.

```bash
npm run infra:up
npm run infra:down
```

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

## Repository Layout

- `config/`: lint, format, unit test, integration test, and E2E test configuration.
- `infra/`: local infrastructure such as Docker Compose.
- `scripts/`: maintenance scripts grouped by responsibility.
- `src/`: application source code.
- `tests/`: unit, integration, and E2E tests.
- `docs/`: project requirements, architecture, decisions, and phase plans.
