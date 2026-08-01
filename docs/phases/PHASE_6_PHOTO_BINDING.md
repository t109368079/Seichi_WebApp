# Phase 6: Mobile Photo Binding

## Objective

Make the phone a capture companion: select a photo from the local library while standing on site, upload it, and bind it permanently to one Scene ID. Uploading the first photo moves the Scene into `PENDING_REVIEW` automatically, replacing the manual marking introduced in Phase 5.

## Phase Scope

- `ScenePhoto` model, Phase 6 migration, and permanent Scene binding.
- A `PhotoStorageAdapter` boundary with a local filesystem implementation.
- `POST /api/scene-photos` upload route and `GET /api/scene-photos/[photoId]` read route.
- Photo selection, preview, and confirmation at `/field/[tripDayId]/[tripSceneId]/upload`.
- Take list, per-take viewing, and per-take deletion on the Field Mode scene page.
- Automatic status transitions on first upload and on removal of the last photo.
- Mobile single-hand layout for the scene and upload views.
- Unit and integration tests for photo binding behavior.
- Phase completion summary at `docs/phase6_summary.md`.
- One phase-level commit after verification.

## Out Of Scope

- E2E tests for photo binding. Deferred by explicit request; recorded in `docs/phase6_summary.md`.
- Side-by-side comparison, best photo selection, and the review queue.
- `isBest` behavior. The column and its uniqueness index ship in Phase 6, but no domain rule or UI reads or writes it until Phase 7.
- Transitions into or out of `REVIEWED`.
- Google OAuth, Google Sheets, Google Drive, and real anime images.
- EXIF parsing, image resizing, thumbnail generation, and format conversion.
- Cross-device push synchronization.
- Route optimization and automatic itinerary sorting.

## Database Impact

Phase 6 adds the `ScenePhoto` table and one migration. No existing table changes.

Relationship rules:

- `ScenePhoto.sceneId` is required and cascades from Scene, because a photo cannot exist without its Scene.
- `ScenePhoto.tripId` and `ScenePhoto.tripDayId` are optional context and use `ON DELETE SET NULL`. Deleting a Trip must never delete photos; D-0018 already hard deletes Trip rows and cascades planning rows.
- `@@unique([sceneId, takeNumber])` prevents concurrent uploads from producing duplicate take numbers.
- A partial unique index enforces at most one `isBest = true` row per Scene, ready for Phase 7.

## Blocks

### Block 6.1: Mobile Scene View

Tasks:

- Add a photo section to the Field Mode scene page listing existing takes.
- Show the target Scene identity prominently on the upload entry and upload page.
- Keep the phone layout single-hand operable.

Acceptance Criteria:

- The current Scene is unambiguous before any upload action.
- Existing takes are visible with take number and file name.
- A Scene with no photos renders an explanatory message, not an error.
- The anime reference panel continues to render for every status.

### Block 6.2: Local Photo Selection

Tasks:

- Accept JPEG, PNG, and WebP from the local library.
- Preview the selected file before upload.
- Allow cancelling without any state change.

Acceptance Criteria:

- Unsupported types are rejected with a stated reason.
- Files above the size limit are rejected with a stated reason.
- Cancelling leaves Scene status and photo rows unchanged.
- The Scene and the selected photo are both visible before confirming.

### Block 6.3: Photo Upload And Scene Binding

Tasks:

- Add the upload route handler, bypassing the 1MB server action body limit.
- Persist storage write and database write in one transaction with compensating cleanup.
- Apply the status transition through the existing Phase 5 transition table.

Acceptance Criteria:

- A missing or unknown `sceneId` is rejected with a clear error.
- A successful upload binds the photo permanently to that Scene.
- A failed upload leaves Scene status and photo rows unchanged and stores no file.
- The first successful upload moves `NOT_SHOT` to `PENDING_REVIEW`.
- Uploading to a `RETAKE_REQUIRED` Scene moves it back to `PENDING_REVIEW`.
- `SKIPPED` and `REVIEWED` statuses are left unchanged by upload.

### Block 6.4: Multiple Takes

Tasks:

- Generate take numbers from the existing maximum inside the transaction.
- List all takes for a Scene.
- Delete a single take without touching the others.

Acceptance Criteria:

- Take numbers are correct and never reused within a Scene.
- A new upload never overwrites an existing take.
- Deleting one photo leaves other takes and their files intact.
- Deleting the last photo returns `PENDING_REVIEW` to `NOT_SHOT`.
- Every remaining photo keeps its Scene binding.

## Status Rules Added In Phase 6

Phase 6 does not change the Phase 5 transition table in `src/domain/scene-status.ts`. It reuses it:

```text
upload  : NOT_SHOT        -> PENDING_REVIEW
          RETAKE_REQUIRED -> PENDING_REVIEW
          PENDING_REVIEW / SKIPPED / REVIEWED -> unchanged

delete  : PENDING_REVIEW  -> NOT_SHOT   (only when the last photo is removed)
          all other statuses -> unchanged
```

Only `NOT_SHOT -> PENDING_REVIEW` and `RETAKE_REQUIRED -> PENDING_REVIEW` are listed in requirements section 8, so no other upload transition is invented here.

## Required Tests

- Unit: accepted and rejected MIME types.
- Unit: file size limit boundaries.
- Unit: take number generation for empty, contiguous, and gapped sequences.
- Unit: upload status resolution for all five statuses.
- Unit: last-photo-removed status resolution.
- Unit: stored file name derivation and extension mapping.
- Integration: upload creates a row, stores bytes, and returns take 1.
- Integration: second upload creates take 2 and preserves take 1.
- Integration: rejected upload writes no row, stores no file, and leaves status unchanged.
- Integration: unknown Scene id is rejected.
- Integration: storage failure rolls back the database write.
- Integration: deleting one take preserves the others and their files.
- Integration: deleting the last take reverts status and removes the file.
- Integration: deleting a Trip preserves photos and nulls their trip context.

## Deferred Tests

E2E coverage for photo binding is deferred by explicit request. `npm run verify` still runs the existing 14 Playwright tests, which must continue to pass because Phase 6 modifies the Field Mode scene page.

## Verification Commands

```bash
npm run db:test:reset
npm run verify
git diff --check
git status --short
```

## Completion Status

Status: Pending final commit

Completed Blocks:

- Block 6.1: Mobile Scene View
- Block 6.2: Local Photo Selection
- Block 6.3: Photo Upload And Scene Binding
- Block 6.4: Multiple Takes

Verification Results:

- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 9 files and 70 tests
- `npm run db:test:reset`: Passed, applies Phase 0, 1, 4, and 6 migrations
- `npm run test:integration`: Passed, 7 files and 43 tests
- `npm run build`: Passed
- `npm run test:e2e`: Passed, 14 Playwright tests, none added this phase
- `npm run verify`: Passed

Known Limitations:

- No E2E coverage for photo binding in this phase.
- Photos are stored on the local filesystem; Google Drive storage lands in Phase 8.
- `capturedAt` comes from the browser file timestamp, not EXIF `DateTimeOriginal`.
- `isBest` is persisted but unused until Phase 7.
- No cross-device synchronization; the tablet must reload to see a phone upload.

Commit:

- Message format: `[Phase 6] add mobile photo binding`
- Hash: recorded in the final Phase 6 completion report.
