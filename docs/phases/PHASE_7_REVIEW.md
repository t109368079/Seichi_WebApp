# Phase 7: Review Workflow

## Objective

Add the post-trip review workflow on top of Phase 6 photo binding. The reviewer can open a queue, compare the anime reference with real-world takes, choose exactly one best photo, and move Scenes through review statuses without losing any take.

## Phase Scope

- Review queue route at `/reviews`.
- Scene review route at `/reviews/[sceneId]`.
- Domain-layer review eligibility, best-photo uniqueness, review status actions, and queue bucket matching.
- Application-layer review queue filters, summaries, labels, and selected-photo helpers.
- Infrastructure repository reads and transaction-backed writes for best-photo selection and review status changes.
- Phase 7 extensions to the shared SceneStatus transition table.
- Capture-scoped Field Mode status actions after review transitions are added.
- Photo deletion behavior that reopens reviewed Scenes when the best or last photo is removed.
- Unit, integration, and E2E tests for the review flow.
- Phase completion summary at `docs/phase7_summary.md`.
- One phase-level commit after full verification.

## Out Of Scope

- A new database migration. `ScenePhoto.isBest` and its partial unique index already exist from Phase 6.
- Google OAuth, Google Sheets, Google Drive, Google Photos, and real anime reference images.
- AI scoring, auto-best selection, image quality ranking, and thumbnails.
- Sharing, publishing, export flows, and route optimization.
- Deleting anime reference images to represent completion.
- Automatic itinerary reordering.

## Database Impact

None. Phase 7 adds no migration and writes only:

- `ScenePhoto.isBest`, using the Phase 6 partial unique index that allows at most one best photo per Scene.
- `Scene.status`, using the existing `SceneStatus` enum.

## Post-Phase 7 Follow-Up

The already-pushed Phase 7 commit remains unchanged. A follow-up cleanup commit allows URL-only scene navigation by making Scene and Location coordinates nullable while preserving the rule that every Scene needs either a complete coordinate pair or `mapsUrl`.

This follow-up does not add Google API integration, Drive images, route optimization, or automatic ordering.

## Blocks

### Block 7.1: Review Domain And Queue

Tasks:

- Add review bucket definitions for pending review, retake required, not shot, missing best, and reviewed.
- Add review eligibility helpers for no photos, photos without best, and photos with best.
- Add queue filtering by status, work, location, trip, and bucket.
- Add queue summaries derived from stored Scene and ScenePhoto state.

Acceptance Criteria:

- `REVIEWED` requires at least one photo and one best photo.
- Best-photo uniqueness is asserted in the domain layer.
- Queue filters can be combined without creating stored bucket state.
- The missing-best bucket finds Scenes with photos and no best photo, regardless of Scene status.

### Block 7.2: Best Photo Selection

Tasks:

- Add transaction-backed best-photo selection.
- Validate that the selected photo belongs to the target Scene.
- Clear any previous best photo before marking the new one.
- Keep all takes visible after selecting or replacing the best photo.

Acceptance Criteria:

- Selecting a best photo never deletes a take.
- Replacing the best photo leaves exactly one best photo.
- Selecting an unknown or unrelated photo is rejected.
- The review detail view shows the current best marker.

### Block 7.3: Review Status Actions

Tasks:

- Extend `src/domain/scene-status.ts` with Phase 7 review transitions.
- Keep existing Field Mode actions scoped to capture work.
- Add transaction-backed review status writes.
- Disable `REVIEWED` in the UI until a best photo exists.

Phase 7 review transitions:

```text
PENDING_REVIEW  -> REVIEWED
PENDING_REVIEW  -> RETAKE_REQUIRED
RETAKE_REQUIRED -> PENDING_REVIEW
```

Repair transitions used by photo deletion:

```text
REVIEWED        -> PENDING_REVIEW
REVIEWED        -> NOT_SHOT
```

Acceptance Criteria:

- A pending Scene with a best photo can become reviewed.
- A pending Scene can be marked retake required.
- A retake-required Scene can return to pending review.
- Illegal review transitions are rejected and leave status unchanged.
- Field Mode does not expose review completion actions.

### Block 7.4: Review UI

Tasks:

- Add the `/reviews` queue page with bucket statistics and filters.
- Add the `/reviews/[sceneId]` detail page.
- Render the anime reference panel beside the selected real-world take.
- Add a take switcher and best-photo action.
- Add entry points from the homepage and Scene/detail-related navigation.

Acceptance Criteria:

- The queue shows the required Traditional Chinese buckets.
- The detail page compares anime reference and real-world take side by side.
- The reviewer can switch between multiple takes.
- `REVIEWED` is disabled with a clear helper message until best photo exists.
- All takes remain visible after choosing or replacing the best photo.

### Block 7.5: Deletion Repair

Tasks:

- Extend photo deletion status resolution for reviewed Scenes.
- Count remaining photos and remaining best photos after deletion.
- Move reviewed Scenes back to pending review or not shot when completion is no longer valid.

Acceptance Criteria:

- Deleting a non-best photo from a reviewed Scene keeps it reviewed.
- Deleting the best photo from a reviewed Scene with remaining takes reopens it to pending review.
- Deleting the last photo from a reviewed Scene returns it to not shot.
- Photo files and rows are still deleted through the Phase 6 storage adapter and repository path.

## Required Tests

- Unit: legal and illegal Phase 7 status transitions.
- Unit: Field Mode actions remain capture-scoped after review transitions are added.
- Unit: review eligibility with no photos, photos without best, and photos with best.
- Unit: best-photo uniqueness and replacement behavior.
- Unit: review queue bucket and filter logic.
- Unit: status after deleting the best photo and last photo.
- Integration: upload photo then see pending review.
- Integration: select best then mark reviewed.
- Integration: replace best photo.
- Integration: mark retake required.
- Integration: upload a new take to a retake-required Scene and return to pending review.
- Integration: delete best photo and verify review reopens.
- Integration: review queue filters by work, location, trip, and bucket.
- E2E: create a trip Scene, upload multiple takes in a real browser, open the review queue, compare reference and takes, select best photo, mark reviewed, and confirm trip progress updates.

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

- Block 7.1: Review Domain And Queue
- Block 7.2: Best Photo Selection
- Block 7.3: Review Status Actions
- Block 7.4: Review UI
- Block 7.5: Deletion Repair

Verification Results:

- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 10 files and 83 tests
- `npm run db:test:reset`: Passed, applies Phase 0, 1, 4, and 6 migrations
- `npm run test:integration`: Passed, 8 files and 51 tests
- `npm run build`: Passed
- `npm run test:e2e`: Passed, 15 Playwright tests
- `npm run verify`: Passed

Known Limitations:

- Anime reference remains the placeholder panel until Phase 8 Google Drive integration.
- Photos are still served through the local Phase 6 storage adapter.
- No AI scoring, auto-best selection, thumbnails, or image compression.
- No Google APIs are called by Phase 7.

Commit:

- Message: `[Phase 7] add review workflow`
- Hash: `b1c7063`

Follow-Up Commit:

- Message: `[Phase 7] allow url-only scene navigation`
