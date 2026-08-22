# Phase 9: Vercel + Neon Deployment

## Objective

Prepare the app for a low-cost production deployment that can be used from
tablet and phone over LTE or Wi-Fi without a local computer.

## Phase Scope

- Vercel Hobby deployment using the free `*.vercel.app` domain.
- Neon Free PostgreSQL as the production database.
- Google Drive as the only production photo storage backend.
- Google Photos Picker as the official field-photo source on Vercel.
- App-level Google email allowlist for single-user access control.
- Prisma migration deployment support for hosted PostgreSQL.
- Production deployment documentation and manual acceptance runbook.
- Unit, integration, and E2E coverage for access control and deployment-critical
  behavior.
- Phase completion summary at `docs/phase9_summary.md`.
- One phase-level commit after full verification.

## Out Of Scope

- Railway, Render, Cloud Run, Supabase, or Cloudflare Access implementation.
- Custom domains or DNS setup.
- Public sharing or multi-user collaboration.
- Direct large-file browser-to-storage upload.
- Raising or bypassing Vercel function body limits.
- Google Photos full-library or album scanning.
- OAuth consent-screen publication or Google Cloud project changes performed by
  code.
- Committing OAuth secrets, database URLs, access tokens, refresh tokens, or
  private Google data.

## Production Deployment Defaults

- `DATABASE_URL`: Neon pooled runtime connection URL.
- `DIRECT_DATABASE_URL`: Neon direct connection URL for Prisma migrations.
- `APP_ALLOWED_GOOGLE_EMAILS`: comma-separated Google email allowlist. Required
  when production access control is active.
- `APP_ACCESS_CONTROL_MODE`: optional local/test override. Defaults to
  production-only enforcement; `required` forces enforcement in development and
  tests.
- `PHOTO_STORAGE_BACKEND=google-drive`.
- `GOOGLE_REDIRECT_URI=https://<vercel-domain>/auth/google/callback`.
- Existing Google OAuth, token encryption, Drive folder, and Maps env vars remain
  required for the deployed app.

## Blocks

### Block 9.1: Deployment Contract And Prisma

Tasks:

- Add deployment scripts for Prisma hosted database migration.
- Add Prisma `directUrl` for Neon direct migration connections.
- Update `.env.example` with Vercel/Neon production variables and guidance.
- Add or document Vercel build command: `npm run db:deploy && npm run build`.

Acceptance Criteria:

- Production migrations can run against `DIRECT_DATABASE_URL`.
- Runtime database traffic uses `DATABASE_URL`.
- Local dev/test behavior is unchanged.
- No production secret value is committed.

### Block 9.2: Production Access Gate

Tasks:

- Add allowlist parsing and matching for `APP_ALLOWED_GOOGLE_EMAILS`.
- Reject disallowed Google OAuth users before token persistence.
- Require an allowed Google session for product pages and app API routes when
  production access control is active.
- Keep OAuth routes public so the allowed user can log in.
- Keep `/integrations/google` reachable before login without exposing saved
  Sheet or Drive settings.

Acceptance Criteria:

- Missing production allowlist denies protected access with a clear message.
- Allowed Google email matching is exact and case-insensitive.
- Disallowed Google users do not receive app sessions and do not persist tokens.
- Unauthenticated production requests cannot view scene, trip, field, import,
  map, review, photo, or anime-image data.
- Development remains open by default.

### Block 9.3: Vercel Photos-First Field Workflow

Tasks:

- Document Google Photos Picker as the official Vercel field-photo path.
- Keep local photo upload as a backup for small files only.
- Surface production guidance that local original-photo upload may exceed Vercel
  request body limits.

Acceptance Criteria:

- Field upload copy clearly distinguishes Google Photos import from local backup
  upload in production.
- Google Photos import continues to store photos through Google Drive.
- Local upload behavior remains available for development and small files.

### Block 9.4: Deployment Runbook And Acceptance

Tasks:

- Add Vercel + Neon runbook to README and Phase 9 summary.
- Document Google Cloud redirect URI and API checklist.
- Document pre-travel manual acceptance over tablet LTE/Wi-Fi.
- Document OAuth consent-screen testing-mode refresh-token risk.

Acceptance Criteria:

- A future operator can deploy from GitHub `t109368079/Seichi_WebApp` using only
  documented settings.
- Manual acceptance covers tablet login, Google Photos import, Drive storage,
  ScenePhoto binding, and review.
- Railway is recorded as the fallback if Vercel serverless limits are too
  restrictive.

## Required Tests

- Unit: parse `APP_ALLOWED_GOOGLE_EMAILS`.
- Unit: exact case-insensitive Google email allowlist match.
- Unit: missing production allowlist denies access.
- Unit: Vercel local upload guidance marks Google Photos as the primary source.
- Integration: allowed Google OAuth user creates a session.
- Integration: disallowed Google OAuth user is rejected without a usable
  persisted session.
- Integration: protected API/page access denies unauthenticated requests when
  access control is required.
- Integration: Google Photos import still writes Drive-backed `ScenePhoto`.
- E2E: unauthenticated browser cannot view protected app pages when access
  control is required.
- E2E: mocked allowed Google login reaches protected pages.
- E2E: mocked disallowed account cannot enter the app.
- E2E: Field upload page keeps Google Photos Picker as the production source.

## Verification Commands

```bash
npm run db:test:reset
npm run verify
git diff --check
git status --short
```

## Manual Vercel Acceptance

1. Create a Neon Free Postgres project.
2. Add the pooled Neon URL as `DATABASE_URL`.
3. Add the direct Neon URL as `DIRECT_DATABASE_URL`.
4. Create a Vercel project from `t109368079/Seichi_WebApp`.
5. Set Vercel build command to `npm run db:deploy && npm run build`.
6. Configure Vercel env vars.
7. Add `https://<vercel-domain>/auth/google/callback` to Google OAuth
   authorized redirect URIs.
8. Enable Google Sheets API, Google Drive API, Google Photos Picker API, and
   Google Maps Embed API.
9. Move OAuth consent screen out of Testing before travel, or explicitly accept
   the 7-day refresh-token expiry risk.
10. Open the Vercel URL from a tablet on LTE or external Wi-Fi.
11. Log in directly on tablet with the allowed Google account.
12. Verify another Google account cannot enter.
13. Open Field Mode, import one Google Photos item, confirm it is stored in
    Google Drive, and review the Scene.

## Completion Status

Status: Complete

Completed Blocks:

- Block 9.1: Deployment contract and Prisma migration support.
- Block 9.2: Production Google-email allowlist access gate.
- Block 9.3: Vercel photos-first field workflow guidance.
- Block 9.4: Deployment runbook and manual acceptance documentation.

Verification:

- `npm run verify` passed.
- `git diff --check` passed.

Known Limitations:

- Vercel local file uploads remain constrained by Vercel request body limits.
- Google Photos Picker is user-selected only; no full-library or album scanning.
- Railway remains the recommended fallback for a low-cost always-on server if
  Vercel limits become painful.

Commit:

- Message: `[Phase 9] add vercel neon deployment`
- Hash: to be reported after the phase commit is created.
