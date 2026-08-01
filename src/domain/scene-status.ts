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

/**
 * Phase 5 transition table. `REVIEWED` has no outgoing transitions because the
 * requirements never list it as a transition source; Phase 7 owns review
 * transitions and will extend this table.
 */
const phase5Transitions = {
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
  return phase5Transitions[assertSceneStatus(current)];
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
  const allowed = getAllowedSceneStatusTransitions(current);

  return fieldStatusActions.filter((action) =>
    allowed.includes(resolveFieldStatusTarget(action)),
  );
}

export function isTerminalFieldStatus(current: SceneStatus): boolean {
  return getAllowedSceneStatusTransitions(current).length === 0;
}
