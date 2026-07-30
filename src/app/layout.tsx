import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
