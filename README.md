# Seichi Pilgrimage App

Responsive web app for managing anime pilgrimage scenes, trips, field photo binding, and review workflows.

Phase 6 currently provides CSV scene import, a no-external-API scene map, a scene catalog, trip planning, tablet field mode, and mobile photo binding, all backed by Prisma and PostgreSQL. It intentionally does not yet implement Google APIs or review workflows.

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

The Phase 4 trip planning page is available at:

```text
http://localhost:3000/trips
```

The scene catalog is available at:

```text
http://localhost:3000/scenes
```

Phase 5 tablet field mode is reached from a trip. Open a trip's today itinerary with:

```text
http://localhost:3000/trips/<tripId>/field
```

That shortcut resolves the current local date to a trip day and redirects to the itinerary route, falling back to the trip's first day when today is outside the trip range. The itinerary and scene execution routes are:

```text
http://localhost:3000/field/<tripDayId>
http://localhost:3000/field/<tripDayId>/<tripSceneId>
```

Scene Import CSV v1 uses:

```text
scene_code,work_name,work_short_code,episode,anime_drive_file_id,location_name,area_name,latitude,longitude,maps_url,notes
```

`scene_code`, `work_name`, `work_short_code`, `anime_drive_file_id`, `location_name`, `area_name`, `latitude`, and `longitude` are required. Values containing commas must be quoted as standard CSV.

The Phase 3 map uses local coordinate projection and generated Google Maps navigation URLs. It does not require Google Maps JavaScript, API keys, OAuth, or external map tiles.

Phase 4 trip planning lets you create a trip, auto-generate daily itineraries from a date range, add scenes from catalog/map/location/detail pages, and save manual scene order. It does not optimize or auto-sort routes.

Phase 5 field mode shows a day's scenes in the manually planned order, displays an anime reference panel for the current scene, generates the Google Maps navigation URL, moves between scenes with previous/next, and records reversible status. Field status actions are 待確認, 需要補拍, 跳過 and 返回未拍攝. `REVIEWED` scenes are read-only until the Phase 7 review workflow. The anime reference is a placeholder until Phase 8 supplies Drive images, and it is never removed by a status change.

Phase 6 photo binding lets the phone upload a real photo from the local library and bind it permanently to one Scene:

```text
http://localhost:3000/field/<tripDayId>/<tripSceneId>/upload
```

Accepted formats are JPEG, PNG, and WebP, up to 15 MB per file. The first successful upload moves a scene from 未拍攝 to 待確認 automatically, and removing the last photo moves it back. A scene keeps every take; a new upload never overwrites an earlier one. Deleting a trip never deletes photos.

Photo bytes are written through a storage adapter to `PHOTO_STORAGE_DIR` (default `storage/scene-photos`), which is gitignored. Uploaded photos are personal data and must never be committed. Google Drive storage arrives in Phase 8 by replacing the adapter; no schema change is needed.

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
