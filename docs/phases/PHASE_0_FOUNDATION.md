# Phase 0: Foundation and Engineering Harness

## Objective

Create a working, testable Next.js foundation with documentation, PostgreSQL, Prisma, automated tests, and one unified verification command.

## Phase Scope

- Dedicated Git repo inside `D:\Workspace\Seichi_WebApp`.
- Required project documentation.
- Next.js, React, TypeScript, Tailwind CSS, ESLint, Prettier.
- Vitest unit and integration testing.
- Playwright E2E testing.
- Docker Compose PostgreSQL.
- Prisma schema, migration, seed, and reset scripts.
- One phase-level commit after full verification.

## Out Of Scope

- Scene, Work, Location, Trip, TripDay, TripScene, ScenePhoto models.
- Google OAuth, Sheets, Drive, Maps, or storage integration.
- PWA offline behavior.
- Product workflows such as import, map, itinerary, upload, or review.

## Blocks

### Block 0.1: Repository And Basic Documents

Tasks:

- Create `README.md`, `AGENTS.md`, `.gitignore`, `.env.example`.
- Create `docs/PROJECT_REQUIREMENTS_AND_PLAN.md`, architecture, data model, test strategy, decisions, and this phase file.
- Encode the phase-level commit rule.

Acceptance Criteria:

- New developers can follow README setup.
- AGENTS defines required reading, workflow, architecture rules, and safety rules.
- No secrets are committed.
- Documents do not contradict the phase-level commit rule.

### Block 0.2: Web App Skeleton

Tasks:

- Configure Next.js App Router, TypeScript, Tailwind CSS, ESLint, and Prettier.
- Add a basic homepage and app shell.
- Add a Playwright homepage E2E test.

Acceptance Criteria:

- Development server can start.
- Production build succeeds.
- Homepage renders and clearly identifies the project.
- Homepage E2E test passes.

### Block 0.3: Database And Migration

Tasks:

- Add Docker Compose PostgreSQL.
- Add Prisma schema with only `FoundationMetadata`.
- Add migration, seed, reset, and test reset scripts.

Acceptance Criteria:

- Empty dev database can be migrated and seeded.
- Test database can be reset independently.
- Integration test can read deterministic seed data.
- No product domain model is introduced.

### Block 0.4: Unified Verification

Tasks:

- Add `npm run verify`.
- Ensure it runs format check, lint, typecheck, unit tests, integration tests, build, and E2E.

Acceptance Criteria:

- Any failed check returns a non-zero exit code.
- Local verification uses one command.
- Phase completion includes `npm run verify`, `git diff --check`, and `git status --short`.

## Required Tests

- Unit: foundation summary calculation and UI status rendering.
- Integration: seeded `FoundationMetadata` can be read from PostgreSQL.
- E2E: homepage loads and displays the app shell.

## Verification Commands

```bash
npm run verify
git diff --check
git status --short
```

## Completion Status

Status: Complete

Completed Blocks:

- Block 0.1: Repository and basic documents
- Block 0.2: Web app skeleton
- Block 0.3: Database and migration
- Block 0.4: Unified verification

Verification Results:

- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 2 tests
- `npm run db:test:reset`: Passed
- `npm run test:integration`: Passed, 1 test
- `npm run build`: Passed
- `npm run test:e2e`: Passed, 1 Playwright test
- `npm run verify`: Passed
- `npm run db:reset`: Passed

Known Limitations:

- First-time manual E2E setup requires `npm run prepare:e2e` to install Playwright Chromium.
- `npm audit` reports remaining high-severity advisories in current Next.js/PostCSS/sharp and ESLint/minimatch dependency paths. The available npm audit fixes either downgrade Next to an unusable legacy version or require Node 20.19+ / incompatible major upgrades. The Phase 0 verification suite does not include `npm audit`.

Commit:

- Message format: `[Phase 0] complete foundation`
- Hash: recorded in the final Phase 0 completion report.
