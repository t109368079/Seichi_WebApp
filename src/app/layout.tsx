import type { Metadata } from "next";
import { AppSidebar } from "@/components/app-sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "聖地巡禮",
  description: "聖地巡禮照片管理網頁應用程式。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="min-h-screen bg-paper text-ink md:grid md:grid-cols-[14rem_minmax(0,1fr)]">
          <AppSidebar />
          <div className="min-w-0">{children}</div>
        </div>
      </body>
    </html>
  );
}
