# Phase 8: Google Integration

## Objective

Connect the stable Phase 7 workflow to real Google OAuth, Google Sheets scene import, Google Drive anime reference images, and Google Drive photo storage without letting UI code call Google APIs directly.

## Phase Scope

- Google OAuth web-server flow with secure token persistence, session cookies, logout, and revocation.
- Google Sheets scene import that reuses the Phase 2 normalized import validation and all-or-nothing commit path.
- Google Drive anime image adapter and app-owned image route for `Scene.animeImageDriveFileId`.
- Google Drive-backed `PhotoStorageAdapter` selected by `PHOTO_STORAGE_BACKEND=google-drive`.
- Integration settings for default Sheet ID/range and Drive photo folder ID.
- Unit, integration, and E2E/mock coverage that does not use production Google data.
- Phase completion summary at `docs/phase8_summary.md`.
- One phase-level commit after full verification.

## Out Of Scope

- Google Photos album scanning.
- Google Sheet write-back or bidirectional sync.
- Google Picker and per-file authorization UI.
- AI matching, scoring, auto-best selection, or image compression.
- Public sharing, multi-user collaboration, route optimization, or automatic itinerary reordering.
- Committing OAuth secrets, access tokens, refresh tokens, or real private Google data.

## Database Impact

Phase 8 adds:

- `GoogleAccount` for Google identity, granted scopes, encrypted access/refresh tokens, expiry, and revocation state.
- `GoogleSession` for hashed app session cookies with expiry and revocation.
- `GoogleIntegrationSettings` for the default scene Sheet ID/range and Drive photo folder ID.

Existing product rows keep their identity rules:

- `Scene.animeImageDriveFileId` remains the Drive file id for anime references.
- `ScenePhoto.storageFileId` remains the storage adapter key; with Drive storage it stores the returned Drive file id.

## Blocks

### Block 8.1: Google OAuth

Tasks:

- Add Google OAuth config parsing and scope constants.
- Add token encryption/decryption with an env-provided encryption key.
- Add `/auth/google/start` and `/auth/google/callback` routes.
- Store account tokens encrypted and sessions hashed.
- Add `/integrations/google` with connection status, settings, and disconnect/revoke actions.

Acceptance Criteria:

- OAuth secrets and tokens are not committed.
- Session cookies are httpOnly and short-lived enough for local use.
- Access token expiry is handled by refresh when a refresh token exists.
- Missing config, expired credentials, and revoked access return clear app errors.
- Logout/revoke clears usable local session state.

### Block 8.2: Google Sheets Adapter

Tasks:

- Add a Sheets adapter over `spreadsheets.values.get`.
- Convert Sheet rows into the existing Scene Import CSV/table contract.
- Add Google Sheet preview and commit intents to `/imports/scenes`.
- Re-read Sheet data on commit so stale previews cannot write changed data silently.

Acceptance Criteria:

- Sheet and CSV imports use the same validation and commit behavior.
- Missing headers, duplicate scene codes, invalid coordinates, and missing navigation references produce existing import errors.
- Google API failures are translated into clear messages.
- Tests use mocks only and never connect to a real Google account.

### Block 8.3: Google Drive Anime Image Adapter

Tasks:

- Add a Drive adapter for file metadata and media download.
- Add `/api/scenes/[sceneId]/anime-image` as the only UI-facing anime image URL.
- Render Drive-backed anime references through the existing `AnimeReferencePanel`.
- Return stable fallback images/messages for missing auth, invalid file id, non-image file, or permission errors.

Acceptance Criteria:

- UI does not call Drive directly.
- Valid Drive image bytes render through the app route.
- Invalid file id and permission denied do not crash the page.
- Anime references are never deleted or hidden to represent completion.

### Block 8.4: Photo Storage Integration

Tasks:

- Let `PhotoStorageAdapter.save` return the final persisted storage descriptor.
- Keep local storage behavior unchanged by default.
- Add Google Drive photo storage for save/read/delete.
- Pass the active Google session from upload/read/delete routes and actions when the Drive backend is selected.

Acceptance Criteria:

- New Drive-backed photos store the returned Drive file id in `ScenePhoto.storageFileId`.
- File move or rename does not break the ScenePhoto relation.
- Storage failure leaves no database row or scene status change.
- Database failure after Drive upload triggers best-effort Drive cleanup.
- The app never depends on Google Photos temporary URLs.

## Required Tests

- Unit: Google scope list and OAuth config availability.
- Unit: token encryption round trip and wrong-key rejection.
- Unit: Sheet value normalization reuses import validation.
- Unit: Google API error translation.
- Integration: mock OAuth callback creates account and session with encrypted tokens.
- Integration: expired token refresh updates the stored access token.
- Integration: revoked/expired sessions are rejected.
- Integration: mock Sheet import preview/commit writes through existing import repository behavior.
- Integration: mock Drive anime image route returns image bytes and fallback errors.
- Integration: Drive photo storage save/read/delete and upload rollback.
- E2E: mocked Google connection and Sheet import smoke path.

## Verification Commands

```bash
npm run db:test:reset
npm run verify
git diff --check
git status --short
```

## Completion Status

Status: Completed

Completed Blocks:

- Block 8.1: Google OAuth.
- Block 8.2: Google Sheets Adapter.
- Block 8.3: Google Drive Anime Image Adapter.
- Block 8.4: Photo Storage Integration.

Known Limitations:

- Google Picker is intentionally not implemented.
- Sheet write-back is intentionally not implemented.
- Google Photos is intentionally not used.
- Google Drive photo storage is opt-in with `PHOTO_STORAGE_BACKEND=google-drive`; local storage remains the default.

Commit:

- Message: `[Phase 8] add google integration`
- Hash: to be reported after the phase commit is created.
