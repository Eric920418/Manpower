import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Noto_Sans_TC } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const notoSansTC = Noto_Sans_TC({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-tc",
});

export const metadata: Metadata = {
  title: "佑羲人力 - 專業外籍勞工仲介",
  description: "佑羲人力提供專業外籍勞工仲介服務，連接全球人才，驅動您的業務增長",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`min-h-screen bg-white text-slate-900 ${notoSansTC.variable} font-sans`}>
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
