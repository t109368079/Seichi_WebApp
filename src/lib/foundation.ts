export type FoundationCheckStatus = "pending" | "ready" | "verified";

export interface FoundationCheck {
  label: string;
  status: FoundationCheckStatus;
}

export interface FoundationSummary {
  total: number;
  verified: number;
  ready: number;
  pending: number;
  complete: boolean;
}

export const foundationChecks = [
  { label: "Documentation", status: "verified" },
  { label: "Web application shell", status: "verified" },
  { label: "Database harness", status: "verified" },
  { label: "Unified verification", status: "verified" },
] as const satisfies readonly FoundationCheck[];

export function summarizeFoundationChecks(
  checks: readonly FoundationCheck[],
): FoundationSummary {
  const summary = checks.reduce(
    (accumulator, check) => {
      accumulator.total += 1;
      accumulator[check.status] += 1;
      return accumulator;
    },
    {
      total: 0,
      verified: 0,
      ready: 0,
      pending: 0,
      complete: false,
    },
  );

  return {
    ...summary,
    complete: summary.total > 0 && summary.verified === summary.total,
  };
}
