# Phase 5: Tablet Field Mode

## Objective

Turn the tablet into the on-site reference and flow-control centre: show today's itinerary in the manually planned order, display the anime reference for the current scene, hand off navigation to Google Maps, and record reversible scene status without ever deleting the anime reference.

## Phase Scope

- `/field/[tripDayId]` route for the today itinerary view.
- `/field/[tripDayId]/[tripSceneId]` route for the scene execution view.
- `/trips/[tripId]/field` shortcut that resolves the current local date to a TripDay and redirects.
- Centralized Phase 5 SceneStatus transition rules in the domain layer.
- Field status actions for pending review, retake required, skipped, and reset to not shot.
- Tablet responsive layout verified at 1024x768, 1280x800, and 1366x1024.
- Field Mode entry points from Trip list, Trip Detail, and the homepage.
- Unit, integration, and E2E tests for Field Mode behavior.
- Phase completion summary at `docs/phase5_summary.md`.
- One phase-level commit after full verification.

## Out Of Scope

- Photo upload, ScenePhoto, and multiple takes.
- Side-by-side comparison, best photo selection, and the review queue.
- Transitions into or out of `REVIEWED`.
- Google OAuth, Google Sheets, Google Drive, and real anime images.
- Route optimization, distance-based ordering, and automatic itinerary sorting.
- Cross-device push synchronization.
- Changes to Scene Import CSV v1 and to the Prisma schema.

## Database Impact

None. Phase 5 adds no models and no migration. It writes only the existing `Scene.status` column and reads existing `Trip`, `TripDay`, `TripScene`, `Scene`, `Work`, and `Location` rows.

## Blocks

### Block 5.1: Today Itinerary

Tasks:

- Add `getLocalTripDateString` to the trip domain using local calendar fields.
- Add `resolveTodayTripDayId` and `getFieldCompletionSummary` to the Field Mode application layer.
- Add the `/field/[tripDayId]` itinerary route showing manual order, work, location, status, and progress.
- Add the `/trips/[tripId]/field` shortcut that redirects to today's day, falling back to the first day.
- Add Field Mode entry points to Trip list and Trip Detail.

Acceptance Criteria:

- Field Mode scene order is identical to Trip Detail order for the same day.
- Progress counts update after a status change.
- Every scene links into its execution page.
- A day with no scenes renders an explanatory message instead of an error.
- The today shortcut resolves against the local calendar date, not a UTC-derived date.

### Block 5.2: Scene Execution Page

Tasks:

- Add `buildFieldSceneCursor` for previous, next, position, and total within one day.
- Add the anime reference placeholder panel component.
- Add the `/field/[tripDayId]/[tripSceneId]` route with reference panel, work, episode, location, notes, status, navigation, and previous/next controls.

Acceptance Criteria:

- The anime reference panel renders for every status and never disappears after a status change.
- Previous and next follow manual `sortOrder` within the day only.
- The first scene has no previous target and the last scene has no next target.
- The navigation button is disabled with a stated reason when coordinates are missing or invalid.
- The view can return to the day itinerary.

### Block 5.3: Field Status Actions

Tasks:

- Add `src/domain/scene-status.ts` holding the single Phase 5 transition table.
- Expose `canTransitionSceneStatus`, `assertSceneStatusTransition`, `getFieldStatusActions`, and `resolveFieldStatusTarget`.
- Add a transactional status update in the Field Mode repository that validates before writing.
- Add a server action with Traditional Chinese error messages.

Phase 5 transition table:

```text
NOT_SHOT        -> PENDING_REVIEW, RETAKE_REQUIRED, SKIPPED
PENDING_REVIEW  -> RETAKE_REQUIRED, SKIPPED, NOT_SHOT
RETAKE_REQUIRED -> PENDING_REVIEW, SKIPPED, NOT_SHOT
SKIPPED         -> NOT_SHOT
REVIEWED        -> (none in Phase 5)
```

Acceptance Criteria:

- Legal transitions persist and refresh the page and the progress counts.
- Illegal transitions are rejected and leave the stored status unchanged.
- Action buttons render only for currently legal targets.
- A `REVIEWED` scene renders no action buttons and states why.
- Status changes never delete or hide the anime reference.

### Block 5.4: Tablet Responsive Layout

Tasks:

- Size the anime reference panel to dominate the viewport at tablet widths.
- Use a minimum 44px touch target for every Field Mode control.
- Verify 1024x768, 1280x800, and 1366x1024 in the Field Mode E2E spec.

Acceptance Criteria:

- The anime reference is clearly visible at all three sizes.
- Primary controls meet the touch target floor.
- No horizontal page scrolling occurs at any of the three sizes.

## Required Tests

- Unit: legal and illegal SceneStatus transitions for all five statuses.
- Unit: `REVIEWED` exposes no field status actions.
- Unit: field status action to target status mapping.
- Unit: previous/next cursor for first, middle, last, single, and unknown ids.
- Unit: today resolution for exact match, no match, and empty day lists.
- Unit: local calendar date derivation across a UTC day boundary.
- Unit: field completion summary arithmetic.
- Integration: day view returns scenes in manual `sortOrder`.
- Integration: legal transition persists and is visible on reload.
- Integration: illegal transition rejects and leaves the row unchanged.
- Integration: cursor resolves previous/next across a persisted day.
- E2E: enter Field Mode from Trip Detail and verify manual order.
- E2E: view the anime reference, work, episode, location, and notes.
- E2E: verify the generated Google Maps navigation URL.
- E2E: move to the next scene and back to the previous scene.
- E2E: apply each status action and verify the reference panel survives.
- E2E: verify layout at 1024x768, 1280x800, and 1366x1024.

## Test Data Constraint

The E2E suite shares one test database and runs with `workers: 1`. Playwright orders spec files by path, so `field-mode.spec.ts` executes before `scene-catalog.spec.ts` and `scene-map.spec.ts`, both of which assert exact `RETAKE_REQUIRED` result sets including a marker group labelled `1 個場景`.

The Field Mode spec must therefore restore every scene it mutates back to its seeded status before finishing. `BHC-001` restores to `NOT_SHOT` and `SLC-001` restores to `PENDING_REVIEW`. Restoration uses the Block 5.3 `返回未拍攝` and `待確認` actions, so it is genuine coverage rather than test-only cleanup.

The Field Mode integration test applies the same rule through an `afterEach` status restore.

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

- Block 5.1: Today Itinerary
- Block 5.2: Scene Execution Page
- Block 5.3: Field Status Actions
- Block 5.4: Tablet Responsive Layout

Verification Results:

- `npm run format:check`: Passed
- `npm run lint`: Passed
- `npm run typecheck`: Passed
- `npm run test:unit`: Passed, 8 files and 52 tests
- `npm run db:test:reset`: Passed, applies Phase 0, Phase 1, and Phase 4 migrations
- `npm run test:integration`: Passed, 6 files and 26 tests
- `npm run build`: Passed
- `npm run test:e2e`: Passed, 14 Playwright tests
- `npm run verify`: Passed

Known Limitations:

- The anime reference is a placeholder until Phase 8 supplies Drive images.
- `REVIEWED` scenes are read-only in Field Mode; Phase 7 owns review transitions.
- `PENDING_REVIEW` is set manually because photo binding does not exist until Phase 6.
- No cross-device synchronization; the tablet must reload to observe external changes.

Commit:

- Message format: `[Phase 5] add tablet field mode`
- Hash: recorded in the final Phase 5 completion report.
