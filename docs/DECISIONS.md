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
