import Link from "next/link";
import { SceneCreateForm } from "@/components/scene-create-form";

export const dynamic = "force-dynamic";

export default function NewScenePage() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-rail bg-[#fff8ed]">
        <div className="mx-auto w-full max-w-4xl px-5 py-7">
          <Link href="/scenes" className="text-sm font-semibold text-field">
            返回場景目錄
          </Link>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">新增場景</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-night">
            替新的分鏡建立固定場景身份，先收進手帳，出門時就不怕漏拍。
          </p>
        </div>
      </header>

      <section
        aria-label="新增場景表單"
        className="mx-auto w-full max-w-4xl px-5 py-6"
      >
        <div className="rounded border border-rail bg-white/95 p-5 shadow-sm">
          <SceneCreateForm />
        </div>
      </section>
    </main>
  );
}
