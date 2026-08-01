import { applyFieldStatusAction } from "@/app/field/actions";
import {
  getFieldSceneActions,
  getFieldStatusActionLabel,
  isFieldSceneReadOnly,
} from "@/application/field-mode";
import { getSceneStatusLabel } from "@/application/scene-catalog";
import type { SceneStatus } from "@/domain/scene";

export function FieldStatusActions({
  sceneId,
  sceneCode,
  status,
  tripDayId,
  tripSceneId,
}: {
  sceneId: string;
  sceneCode: string;
  status: SceneStatus;
  tripDayId: string;
  tripSceneId: string;
}) {
  const actions = getFieldSceneActions(status);

  if (isFieldSceneReadOnly(status)) {
    return (
      <div className="rounded border border-rail bg-paper p-4 text-sm leading-6 text-night">
        此場景已標記為「{getSceneStatusLabel(status)}
        」，現地模式不提供變更。請從 Review 流程調整審核狀態。
      </div>
    );
  }

  return (
    <div
      aria-label={`${sceneCode} 現地狀態操作`}
      role="group"
      className="grid gap-3 sm:grid-cols-2"
    >
      {actions.map((action) => (
        <form key={action} action={applyFieldStatusAction}>
          <input type="hidden" name="sceneId" value={sceneId} />
          <input type="hidden" name="tripDayId" value={tripDayId} />
          <input type="hidden" name="tripSceneId" value={tripSceneId} />
          <input type="hidden" name="action" value={action} />
          <button
            type="submit"
            className="min-h-11 w-full rounded border border-rail bg-white px-4 text-base font-semibold"
          >
            {getFieldStatusActionLabel(action)}
          </button>
        </form>
      ))}
    </div>
  );
}
