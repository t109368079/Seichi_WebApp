# Project Purpose

This repository contains a responsive pilgrimage photo management application for planning anime scene visits, binding field photos to permanent scene identities, and reviewing results after a trip.

# Required Reading

Before changing code:

1. Read `docs/PROJECT_REQUIREMENTS_AND_PLAN.md`.
2. Read the current phase document in `docs/phases/`.
3. Inspect the existing implementation and tests.

# Engineering Workflow

For each phase:

1. Inspect the current repository state.
2. Plan the current phase before implementation.
3. Implement only the approved phase scope.
4. Keep blocks useful for acceptance and testing, but do not commit each block.
5. Add or update required tests.
6. Run block-specific verification while developing when useful.
7. Run `npm run verify` before phase completion.
8. Update documentation and the phase document.
9. Create one focused commit for the completed phase using `[Phase <n>] <feature>`.
10. Leave the project worktree clean.

# Architecture Rules

- Business rules belong in the domain layer.
- UI must not directly call Google APIs.
- External services must use adapters.
- Scene identity uses `sceneId` / `sceneCode`, never filenames.
- Photos must be bound to exactly one Scene.
- Do not delete anime images to represent completion.
- Do not automatically reorder user itineraries.
- Phase 0 must not introduce product domain models such as Scene, Work, Location, Trip, or ScenePhoto.

# Safety Rules

- Never commit secrets.
- Do not commit `.env`.
- Do not use production Google data in automated tests.
- Use fixtures, mocks, and local test databases.
- Do not implement out-of-scope features.
- Do not force push or rewrite published history unless explicitly requested.

# Git Rules

- The primary branch is `main`.
- Commit messages must use `[Phase <n>] <feature>`.
- Example: `[Phase 0] complete foundation`.
- Do not use Conventional Commits for phase completion commits.

# Definition of Done

A phase is complete only when acceptance criteria, required tests, lint, typecheck, build, documentation, one focused phase commit, and clean git status are all satisfied.
