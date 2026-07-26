import { FoundationStatus } from "@/components/foundation-status";
import { foundationChecks, summarizeFoundationChecks } from "@/lib/foundation";

export default function Home() {
  const summary = summarizeFoundationChecks(foundationChecks);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="border-b border-rail bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-field">
              Phase 0 Foundation
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">
              Seichi Pilgrimage
            </h1>
            <p className="mt-4 text-base leading-7 text-night">
              A responsive engineering harness for future scene catalog,
              itinerary, field photo binding, and review workflows.
            </p>
          </div>
          <div className="rounded border border-rail bg-paper px-4 py-3 text-sm">
            <span className="font-semibold">{summary.verified}</span> of{" "}
            <span className="font-semibold">{summary.total}</span> foundation
            checks verified
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.5fr_1fr]">
        <FoundationStatus checks={foundationChecks} summary={summary} />

        <section className="rounded border border-rail bg-white p-5">
          <h2 className="text-lg font-semibold">Current Boundary</h2>
          <p className="mt-3 text-sm leading-6 text-night">
            Phase 0 proves the project can build, test, migrate, seed, and run
            in a browser. Product domain models and Google integrations begin
            only after their approved phases.
          </p>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex items-center justify-between border-t border-rail pt-3">
              <dt className="text-night">Commit cadence</dt>
              <dd className="font-medium">Once per phase</dd>
            </div>
            <div className="flex items-center justify-between border-t border-rail pt-3">
              <dt className="text-night">Database</dt>
              <dd className="font-medium">PostgreSQL + Prisma</dd>
            </div>
            <div className="flex items-center justify-between border-t border-rail pt-3">
              <dt className="text-night">External APIs</dt>
              <dd className="font-medium">Deferred</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
