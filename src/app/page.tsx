import { FoundationStatus } from "@/components/foundation-status";
import { foundationChecks, summarizeFoundationChecks } from "@/lib/foundation";
import Link from "next/link";

export default function Home() {
  const summary = summarizeFoundationChecks(foundationChecks);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="border-b border-rail bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-field">
              Phase 1 Scene Catalog
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">
              Seichi Pilgrimage
            </h1>
            <p className="mt-4 text-base leading-7 text-night">
              Browse demo pilgrimage scenes by permanent scene identity, work,
              location, and reversible shooting status.
            </p>
          </div>
          <Link
            href="/scenes"
            className="flex min-h-11 w-fit items-center rounded bg-field px-5 text-sm font-semibold text-white"
          >
            Open scene catalog
          </Link>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.5fr_1fr]">
        <FoundationStatus checks={foundationChecks} summary={summary} />

        <section className="rounded border border-rail bg-white p-5">
          <h2 className="text-lg font-semibold">Current Boundary</h2>
          <p className="mt-3 text-sm leading-6 text-night">
            Phase 1 adds the first product catalog slice: Work, Location, Scene,
            SceneStatus, deterministic demo data, and a browsable scene list.
            Imports, maps, trips, photo binding, and Google integrations remain
            deferred.
          </p>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex items-center justify-between border-t border-rail pt-3">
              <dt className="text-night">Demo works</dt>
              <dd className="font-medium">3</dd>
            </div>
            <div className="flex items-center justify-between border-t border-rail pt-3">
              <dt className="text-night">Demo scenes</dt>
              <dd className="font-medium">12</dd>
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
