"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { label: "主頁", href: "/" },
  { label: "地圖", href: "/map" },
  { label: "旅行規劃", href: "/trips" },
  { label: "場景目錄", href: "/scenes" },
  { label: "審核", href: "/reviews" },
  { label: "Google整合", href: "/integrations/google" },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-30 border-b border-rail bg-[#fff8ed]/95 backdrop-blur md:h-screen md:border-b-0 md:border-r">
      <div className="flex min-w-0 items-center gap-4 px-4 py-3 md:grid md:gap-6 md:px-4 md:py-5">
        <Link
          href="/"
          className="grid shrink-0 gap-0.5 text-sm font-semibold text-field"
        >
          <span>聖地巡禮</span>
          <span className="hidden text-xs font-medium text-night md:block">
            出發手帳
          </span>
        </Link>
        <nav
          aria-label="主要導覽"
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto md:grid md:overflow-visible"
        >
          {navigationItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 shrink-0 items-center rounded border px-3 text-sm font-semibold transition-colors md:w-full ${
                  active
                    ? "border-field bg-field text-white shadow-sm"
                    : "border-transparent text-night hover:border-rail hover:bg-white hover:text-field"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
