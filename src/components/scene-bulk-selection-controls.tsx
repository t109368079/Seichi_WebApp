"use client";

interface SceneBulkSelectionControlsProps {
  disabled: boolean;
}

export function SceneBulkSelectionControls({
  disabled,
}: SceneBulkSelectionControlsProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => setVisibleSceneSelection(event.currentTarget, true)}
        className="min-h-10 w-fit rounded border border-rail px-4 text-sm font-semibold disabled:opacity-60"
      >
        全選目前篩選結果
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={(event) =>
          setVisibleSceneSelection(event.currentTarget, false)
        }
        className="min-h-10 w-fit rounded border border-rail px-4 text-sm font-semibold disabled:opacity-60"
      >
        全部不選
      </button>
    </div>
  );
}

function setVisibleSceneSelection(button: HTMLButtonElement, checked: boolean) {
  const form = button.form;

  if (!form) {
    return;
  }

  const sceneInputs = form.querySelectorAll<HTMLInputElement>(
    'input[name="sceneId"]:not(:disabled)',
  );

  sceneInputs.forEach((input) => {
    input.checked = checked;
  });
}
