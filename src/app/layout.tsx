import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seichi Pilgrimage",
  description: "Engineering foundation for the Seichi Pilgrimage app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
