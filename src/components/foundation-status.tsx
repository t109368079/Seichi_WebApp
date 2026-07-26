import type { FoundationCheck, FoundationSummary } from "@/lib/foundation";

interface FoundationStatusProps {
  checks: readonly FoundationCheck[];
  summary: FoundationSummary;
}

export function FoundationStatus({ checks, summary }: FoundationStatusProps) {
  return (
    <section
      aria-label="Foundation status"
      className="rounded border border-rail bg-white p-5"
    >
      <div className="flex flex-col gap-3 border-b border-rail pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Engineering Harness</h2>
          <p className="mt-1 text-sm text-night">
            Required Phase 0 systems and verification gates.
          </p>
        </div>
        <span className="w-fit rounded bg-field px-3 py-1 text-sm font-semibold text-white">
          {summary.complete ? "Ready" : "In progress"}
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
              {check.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
