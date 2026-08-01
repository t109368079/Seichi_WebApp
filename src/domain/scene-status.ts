import { assertSceneStatus, type SceneStatus } from "@/domain/scene";

export const fieldStatusActions = [
  "MARK_PENDING_REVIEW",
  "MARK_RETAKE_REQUIRED",
  "MARK_SKIPPED",
  "RESET_TO_NOT_SHOT",
] as const;

export type FieldStatusAction = (typeof fieldStatusActions)[number];

const fieldStatusActionTargets = {
  MARK_PENDING_REVIEW: "PENDING_REVIEW",
  MARK_RETAKE_REQUIRED: "RETAKE_REQUIRED",
  MARK_SKIPPED: "SKIPPED",
  RESET_TO_NOT_SHOT: "NOT_SHOT",
} satisfies Record<FieldStatusAction, SceneStatus>;

const sceneStatusTransitions = {
  NOT_SHOT: ["PENDING_REVIEW", "RETAKE_REQUIRED", "SKIPPED"],
  PENDING_REVIEW: ["REVIEWED", "RETAKE_REQUIRED", "SKIPPED", "NOT_SHOT"],
  REVIEWED: ["PENDING_REVIEW", "NOT_SHOT"],
  RETAKE_REQUIRED: ["PENDING_REVIEW", "SKIPPED", "NOT_SHOT"],
  SKIPPED: ["NOT_SHOT"],
} satisfies Record<SceneStatus, readonly SceneStatus[]>;

/**
 * Field Mode remains a capture workflow. Phase 7 review transitions are legal
 * domain transitions, but they are not exposed as field actions.
 */
const fieldModeTransitions = {
  NOT_SHOT: ["PENDING_REVIEW", "RETAKE_REQUIRED", "SKIPPED"],
  PENDING_REVIEW: ["RETAKE_REQUIRED", "SKIPPED", "NOT_SHOT"],
  REVIEWED: [],
  RETAKE_REQUIRED: ["PENDING_REVIEW", "SKIPPED", "NOT_SHOT"],
  SKIPPED: ["NOT_SHOT"],
} satisfies Record<SceneStatus, readonly SceneStatus[]>;

export function isFieldStatusAction(value: string): value is FieldStatusAction {
  return fieldStatusActions.includes(value as FieldStatusAction);
}

export function assertFieldStatusAction(value: string): FieldStatusAction {
  if (!isFieldStatusAction(value)) {
    throw new Error(`Invalid FieldStatusAction: ${value}`);
  }

  return value;
}

export function resolveFieldStatusTarget(
  action: FieldStatusAction,
): SceneStatus {
  return fieldStatusActionTargets[action];
}

export function getAllowedSceneStatusTransitions(
  current: SceneStatus,
): readonly SceneStatus[] {
  return sceneStatusTransitions[assertSceneStatus(current)];
}

export function canTransitionSceneStatus(
  from: SceneStatus,
  to: SceneStatus,
): boolean {
  return getAllowedSceneStatusTransitions(from).includes(assertSceneStatus(to));
}

export function assertSceneStatusTransition(
  from: SceneStatus,
  to: SceneStatus,
): SceneStatus {
  if (!canTransitionSceneStatus(from, to)) {
    throw new Error(`Illegal SceneStatus transition: ${from} -> ${to}`);
  }

  return to;
}

export function getFieldStatusActions(
  current: SceneStatus,
): FieldStatusAction[] {
  const allowed: readonly SceneStatus[] =
    fieldModeTransitions[assertSceneStatus(current)];

  return fieldStatusActions.filter((action) =>
    allowed.includes(resolveFieldStatusTarget(action)),
  );
}

export function isTerminalFieldStatus(current: SceneStatus): boolean {
  return fieldModeTransitions[assertSceneStatus(current)].length === 0;
}
