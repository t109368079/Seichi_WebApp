import Image from "next/image";
import Link from "next/link";
import { requireAppPageAccess } from "@/app/access-control";
import mainVisual from "../../docs/images/動畫主視覺.png";

const quickLinks = [
  {
    href: "/imports/scenes",
    ariaLabel: "匯入場景",
    lines: ["匯入", "場景"],
    tone: "primary",
  },
  {
    href: "/map",
    ariaLabel: "地圖",
    lines: ["地圖"],
    tone: "quiet",
  },
  {
    href: "/trips",
    ariaLabel: "旅行規劃",
    lines: ["旅行", "規劃"],
    tone: "quiet",
  },
  {
    href: "/scenes",
    ariaLabel: "場景目錄",
    lines: ["場景", "目錄"],
    tone: "quiet",
  },
  {
    href: "/reviews",
    ariaLabel: "審核",
    lines: ["審核"],
    tone: "quiet",
  },
  {
    href: "/integrations/google",
    ariaLabel: "Google 整合",
    lines: ["Google", "整合"],
    tone: "quiet",
  },
] as const;

const routeSteps = [
  { label: "收景", caption: "作品與集數" },
  { label: "排路", caption: "地圖與日程" },
  { label: "現地", caption: "參考圖拍攝" },
  { label: "回看", caption: "照片審核" },
] as const;

const workbenchCards = [
  {
    href: "/scenes",
    title: "場景目錄",
    meta: "分鏡卡",
    body: "整理 scene code、作品、集數、地點與備註。",
    accentClass: "bg-[#8cc7d8]",
  },
  {
    href: "/map",
    title: "地圖",
    meta: "路線圖",
    body: "把同一帶的作品場景放到同一張地圖上。",
    accentClass: "bg-[#f2c35e]",
  },
  {
    href: "/trips",
    title: "旅行規劃",
    meta: "行程表",
    body: "依照每天的節奏，手動排好下一幕。",
    accentClass: "bg-[#9fbf7a]",
  },
  {
    href: "/reviews",
    title: "審核",
    meta: "底片夾",
    body: "把現地照片和動畫參考放在一起確認。",
    accentClass: "bg-[#ef9b91]",
  },
] as const;

const sceneNotes = [
  "動畫參考圖保留",
  "場景身份固定",
  "路線手動排序",
  "照片回來再比對",
] as const;

export default async function Home() {
  await requireAppPageAccess();

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="overflow-hidden border-b border-[#e5d9c8] bg-[#fff8ed]">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(22rem,1fr)] lg:items-center lg:py-12">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-field">
              動畫聖地巡禮出發前
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-5xl">
              聖地巡禮出發手帳
            </h1>
            <p className="mt-4 max-w-xl text-2xl font-semibold leading-9 text-night">
              今天要去哪一幕？
            </p>
            <p className="mt-3 max-w-xl text-base leading-7 text-night">
              把動畫裡的街角、車站與坡道收進清單，出門前排好路線，回來後直接比對照片。
            </p>

            <nav
              aria-label="首頁快速入口"
              className="mt-7 grid w-full grid-cols-6 gap-1 sm:gap-2 lg:max-w-[35rem]"
            >
              {quickLinks.map((link) => (
                <HomeQuickLink key={link.href} link={link} />
              ))}
            </nav>
          </div>

          <StoryboardPreview />
        </div>
      </section>

      <section className="border-b border-rail bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-4 px-6 py-6 md:grid-cols-4">
          {routeSteps.map((step, index) => (
            <div key={step.label} className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[#d5c1a7] bg-[#fff8ed] text-sm font-semibold text-field">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{step.label}</p>
                <p className="text-sm leading-5 text-night">{step.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-field">巡禮工作台</p>
              <h2 className="mt-1 text-2xl font-semibold">出發前的四張卡</h2>
            </div>
            <Link
              href="/imports/scenes"
              className="w-fit rounded bg-field px-4 py-2 text-sm font-semibold text-white"
            >
              匯入新場景
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {workbenchCards.map((card) => (
              <WorkbenchCard key={card.href} card={card} />
            ))}
          </div>
        </div>

        <aside className="border-l-0 border-rail bg-[#fffdf8] p-5 lg:border-l">
          <p className="text-sm font-semibold text-field">巡禮筆記</p>
          <h2 className="mt-1 text-2xl font-semibold">不要弄丟任何一幕</h2>
          <ul className="mt-5 grid gap-3">
            {sceneNotes.map((note) => (
              <li
                key={note}
                className="flex items-center gap-3 border-b border-[#eadfce] pb-3 last:border-b-0 last:pb-0"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#ef9b91]" />
                <span className="text-sm leading-6 text-night">{note}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}

function HomeQuickLink({ link }: { link: (typeof quickLinks)[number] }) {
  const isPrimary = link.tone === "primary";

  return (
    <Link
      href={link.href}
      aria-label={link.ariaLabel}
      className={`flex min-h-14 min-w-0 items-center justify-center rounded px-1 text-center text-[0.65rem] font-semibold leading-4 sm:min-h-12 sm:px-2 sm:text-sm ${
        isPrimary
          ? "bg-field text-white shadow-sm"
          : "border border-[#d5c1a7] bg-white text-night hover:border-field hover:text-field"
      }`}
    >
      <span className="min-w-0 break-words">
        {link.lines.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </span>
    </Link>
  );
}

function StoryboardPreview() {
  return (
    <figure
      aria-label="巡禮分鏡預覽"
      className="relative min-h-[25rem] overflow-hidden rounded border border-[#d7c5ac] bg-[#fffdf8] shadow-sm"
    >
      <Image
        src={mainVisual}
        alt="BanG Dream! It's MyGO!!!!! 主視覺"
        fill
        priority
        sizes="(min-width: 1024px) 520px, 100vw"
        className="object-cover"
      />
    </figure>
  );
}

function WorkbenchCard({ card }: { card: (typeof workbenchCards)[number] }) {
  return (
    <Link
      href={card.href}
      className="group grid min-h-44 rounded border border-rail bg-white/95 p-5 shadow-sm transition-colors hover:border-field"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-field">{card.meta}</p>
          <h3 className="mt-1 text-xl font-semibold">{card.title}</h3>
        </div>
        <span
          aria-hidden="true"
          className={`h-10 w-10 rounded ${card.accentClass}`}
        />
      </div>
      <p className="mt-4 text-sm leading-6 text-night">{card.body}</p>
      <p className="mt-auto pt-4 text-sm font-semibold text-field group-hover:text-night">
        前往
      </p>
    </Link>
  );
}
