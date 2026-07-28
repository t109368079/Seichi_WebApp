# Decisions

## D-0001: Commit Once Per Phase

Status: Accepted

Each phase is committed once after the whole phase is implemented, verified, documented, and reviewed. Blocks remain planning and acceptance units, but they do not require separate commits.

## D-0002: Dedicated Project Repository

Status: Accepted

`D:\Workspace\Seichi_WebApp` is a dedicated Git repository. The parent `D:\Workspace` repository is not used for this project.

## D-0003: Local PostgreSQL Through Docker Compose

Status: Accepted

Phase 0 uses Docker Compose PostgreSQL for deterministic local development and integration tests.

## D-0004: Prisma 6 For Current Node Compatibility

Status: Accepted

The local environment is Node.js 20.13.1. Prisma 7 requires Node `^20.19 || ^22.12 || >=24.0`, so Phase 0 pins Prisma 6.19.3, which supports Node `>=18.18`.

## D-0005: No Product Domain Models In Phase 0

Status: Accepted

Phase 0 includes only a foundation metadata model. Scene, Work, Location, Trip, and photo models begin in later approved phases.

## D-0006: Main Branch

Status: Accepted

The primary branch is `main`.

## D-0007: Phase Commit Message Format

Status: Accepted

Phase completion commits must use `[Phase <n>] <feature>`, for example `[Phase 0] complete foundation`.

## D-0008: Organized Repository Layout

Status: Accepted

Root should keep only required project entrypoints and tool-discovery files. Config files live in `config/`, local infrastructure in `infra/`, maintenance scripts in `scripts/`, application code in `src/`, tests in `tests/`, and canonical requirements in `docs/`.

## D-0009: Fictional Deterministic Demo Catalog

Status: Accepted

Phase 1 uses fictional works, public-place coordinates, and synthetic Drive file ids. Seed data uses deterministic IDs so unit, integration, E2E, and acceptance checks can assert stable cross-work catalog behavior without private Google data.

## D-0010: Dynamic Catalog Pages

Status: Accepted

Scene catalog pages are rendered dynamically at runtime. This keeps production builds independent from a live database connection while preserving Prisma-backed catalog browsing when the app runs.

## D-0011: E2E Uses Test Database

Status: Accepted

Playwright starts the Next.js dev server with `DATABASE_URL` pointed at the test database. This lets `npm run verify` reset and seed the test database before browser tests inspect the scene catalog.

## D-0012: Scene Import CSV V1 Is An Adapter Contract

Status: Accepted

Phase 2 defines CSV v1 with explicit `work_short_code` and `area_name` columns. CSV parsing converts rows into a normalized import model, so future Google Sheets import can reuse validation and commit behavior without coupling the app to CSV column names.

## D-0013: Scene Import Uses All-Or-Nothing Upsert

Status: Accepted

Scene import previews create and update counts before writing. Confirmed imports use a single database transaction and match existing data by `sceneCode`, `workShortCode`, and `locationName + areaName`. Existing Scene status is preserved, new scenes default to `NOT_SHOT`, and any validation error prevents all writes.

## D-0014: Playwright Uses A Dedicated Local Port

Status: Accepted

Playwright uses port `3100` by default, with `E2E_PORT` available for override. This avoids colliding with the normal developer server on port `3000` while keeping browser tests pointed at the test database.
