import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FoundationStatus } from "@/components/foundation-status";
import { summarizeFoundationChecks } from "@/lib/foundation";

describe("foundation summary", () => {
  it("marks the foundation complete only when all checks are verified", () => {
    const summary = summarizeFoundationChecks([
      { label: "Docs", status: "verified" },
      { label: "Database", status: "ready" },
      { label: "E2E", status: "pending" },
    ]);

    expect(summary).toEqual({
      total: 3,
      verified: 1,
      ready: 1,
      pending: 1,
      complete: false,
    });
  });

  it("renders the foundation status component", () => {
    const checks = [
      { label: "Documentation", status: "verified" },
      { label: "Unified verification", status: "verified" },
    ] as const;

    render(
      <FoundationStatus
        checks={checks}
        summary={summarizeFoundationChecks(checks)}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Foundation status" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Engineering Harness")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });
});
