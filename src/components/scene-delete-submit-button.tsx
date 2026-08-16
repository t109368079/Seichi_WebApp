"use client";

import { useFormStatus } from "react-dom";

export function SceneDeleteSubmitButton({ sceneCode }: { sceneCode: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`刪除 ${sceneCode}`}
      onClick={(event) => {
        if (!window.confirm(`刪除場景 ${sceneCode}？`)) {
          event.preventDefault();
        }
      }}
      className="min-h-10 rounded border border-[#f1c6bb] px-4 text-sm font-semibold text-signal disabled:opacity-60"
    >
      {pending ? "刪除中..." : "刪除場景"}
    </button>
  );
}
