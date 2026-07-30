import type { FoundationCheck, FoundationSummary } from "@/lib/foundation";

interface FoundationStatusProps {
  checks: readonly FoundationCheck[];
  summary: FoundationSummary;
}

export function FoundationStatus({ checks, summary }: FoundationStatusProps) {
  return (
    <section
      aria-label="基礎工程狀態"
      className="rounded border border-rail bg-white p-5"
    >
      <div className="flex flex-col gap-3 border-b border-rail pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">工程基礎</h2>
          <p className="mt-1 text-sm text-night">
            第 0 階段必要系統與驗證關卡。
          </p>
        </div>
        <span className="w-fit rounded bg-field px-3 py-1 text-sm font-semibold text-white">
          {summary.complete ? "已就緒" : "進行中"}
        </span>
      </div>

      <ul className="mt-4 grid gap-3">
        {checks.map((check) => (
          <li
            key={check.label}
            className="flex items-center justify-between gap-4 rounded border border-rail px-4 py-3"
          >
            <span className="text-sm font-medium">{check.label}</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-field">
              {getFoundationStatusLabel(check.status)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function getFoundationStatusLabel(status: FoundationCheck["status"]): string {
  const labels = {
    pending: "待處理",
    ready: "準備完成",
    verified: "已驗證",
  } satisfies Record<FoundationCheck["status"], string>;

  return labels[status];
}
