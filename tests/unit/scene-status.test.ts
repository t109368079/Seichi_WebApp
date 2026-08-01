import { describe, expect, it } from "vitest";
import { sceneStatuses, type SceneStatus } from "@/domain/scene";
import {
  assertFieldStatusAction,
  assertSceneStatusTransition,
  canTransitionSceneStatus,
  getAllowedSceneStatusTransitions,
  getFieldStatusActions,
  isTerminalFieldStatus,
  resolveFieldStatusTarget,
} from "@/domain/scene-status";

const expectedTransitions: Record<SceneStatus, SceneStatus[]> = {
  NOT_SHOT: ["PENDING_REVIEW", "RETAKE_REQUIRED", "SKIPPED"],
  PENDING_REVIEW: ["REVIEWED", "RETAKE_REQUIRED", "SKIPPED", "NOT_SHOT"],
  REVIEWED: ["PENDING_REVIEW", "NOT_SHOT"],
  RETAKE_REQUIRED: ["PENDING_REVIEW", "SKIPPED", "NOT_SHOT"],
  SKIPPED: ["NOT_SHOT"],
};

describe("scene status transitions", () => {
  it("accepts every legal transition in the table", () => {
    for (const status of sceneStatuses) {
      for (const target of expectedTransitions[status]) {
        expect(canTransitionSceneStatus(status, target)).toBe(true);
        expect(assertSceneStatusTransition(status, target)).toBe(target);
      }
    }
  });

  it("rejects every transition absent from the table", () => {
    for (const status of sceneStatuses) {
      const illegal = sceneStatuses.filter(
        (candidate) => !expectedTransitions[status].includes(candidate),
      );

      for (const target of illegal) {
        expect(canTransitionSceneStatus(status, target)).toBe(false);
        expect(() => assertSceneStatusTransition(status, target)).toThrow(
          `Illegal SceneStatus transition: ${status} -> ${target}`,
        );
      }
    }
  });

  it("allows Phase 7 review completion only from pending review", () => {
    expect(getAllowedSceneStatusTransitions("PENDING_REVIEW")).toContain(
      "REVIEWED",
    );
    expect(getAllowedSceneStatusTransitions("NOT_SHOT")).not.toContain(
      "REVIEWED",
    );
    expect(getAllowedSceneStatusTransitions("RETAKE_REQUIRED")).not.toContain(
      "REVIEWED",
    );
  });

  it("keeps REVIEWED read-only in Field Mode", () => {
    expect(isTerminalFieldStatus("REVIEWED")).toBe(true);
    expect(getFieldStatusActions("REVIEWED")).toEqual([]);
  });

  it("rejects a self transition", () => {
    expect(canTransitionSceneStatus("NOT_SHOT", "NOT_SHOT")).toBe(false);
    expect(canTransitionSceneStatus("SKIPPED", "SKIPPED")).toBe(false);
  });
});

describe("field status actions", () => {
  it("maps each action to its target status", () => {
    expect(resolveFieldStatusTarget("MARK_PENDING_REVIEW")).toBe(
      "PENDING_REVIEW",
    );
    expect(resolveFieldStatusTarget("MARK_RETAKE_REQUIRED")).toBe(
      "RETAKE_REQUIRED",
    );
    expect(resolveFieldStatusTarget("MARK_SKIPPED")).toBe("SKIPPED");
    expect(resolveFieldStatusTarget("RESET_TO_NOT_SHOT")).toBe("NOT_SHOT");
  });

  it("offers only actions whose target is currently legal", () => {
    expect(getFieldStatusActions("NOT_SHOT")).toEqual([
      "MARK_PENDING_REVIEW",
      "MARK_RETAKE_REQUIRED",
      "MARK_SKIPPED",
    ]);
    expect(getFieldStatusActions("PENDING_REVIEW")).toEqual([
      "MARK_RETAKE_REQUIRED",
      "MARK_SKIPPED",
      "RESET_TO_NOT_SHOT",
    ]);
    expect(getFieldStatusActions("RETAKE_REQUIRED")).toEqual([
      "MARK_PENDING_REVIEW",
      "MARK_SKIPPED",
      "RESET_TO_NOT_SHOT",
    ]);
    expect(getFieldStatusActions("SKIPPED")).toEqual(["RESET_TO_NOT_SHOT"]);
  });

  it("allows marking pending review without a photo in phase 5", () => {
    expect(getFieldStatusActions("NOT_SHOT")).toContain("MARK_PENDING_REVIEW");
    expect(canTransitionSceneStatus("NOT_SHOT", "PENDING_REVIEW")).toBe(true);
  });

  it("rejects unknown action identifiers", () => {
    expect(assertFieldStatusAction("MARK_SKIPPED")).toBe("MARK_SKIPPED");
    expect(() => assertFieldStatusAction("MARK_REVIEWED")).toThrow(
      "Invalid FieldStatusAction: MARK_REVIEWED",
    );
  });
});
