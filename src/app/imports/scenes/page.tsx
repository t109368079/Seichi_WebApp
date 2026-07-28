import Link from "next/link";
import { SceneImportForm } from "@/components/scene-import-form";

export const dynamic = "force-dynamic";

export default function SceneImportPage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-7 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-wide text-field"
            >
              Seichi Pilgrimage
            </Link>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
              Scene Import
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-night">
              Preview and commit CSV scene data before it appears in the
              catalog.
            </p>
          </div>
          <Link
            href="/scenes"
            className="flex min-h-11 w-fit items-center rounded border border-rail px-5 text-sm font-semibold"
          >
            Scene catalog
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 py-6">
        <SceneImportForm />
      </div>
    </main>
  );
}
