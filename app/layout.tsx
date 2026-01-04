import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Noto_Sans_TC } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { FloatingLinksWrapper } from "@/components/FloatingLinksWrapper";

const notoSansTC = Noto_Sans_TC({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-tc",
});

const siteUrl = process.env.NEXTAUTH_URL || "https://yoshi3166.com";
const siteName = "佑羲人力";
const siteDescription = "佑羲人力提供專業外籍勞工仲介服務，連接全球人才，驅動您的業務增長。專營看護工、幫傭、廠工、營造工等外籍勞工引進，提供完整的人力仲介解決方案。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} - 專業外籍勞工仲介`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "外籍勞工",
    "外勞仲介",
    "人力仲介",
    "看護工",
    "幫傭",
    "廠工",
    "營造工",
    "外籍看護",
    "外勞申請",
    "移工",
    "佑羲人力",
    "台灣外勞",
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: siteUrl,
    siteName: siteName,
    title: `${siteName} - 專業外籍勞工仲介`,
    description: siteDescription,
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: `${siteName} Logo`,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${siteName} - 專業外籍勞工仲介`,
    description: siteDescription,
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // google: "your-google-verification-code", // 之後可加入 Google Search Console 驗證碼
  },
  alternates: {
    canonical: siteUrl,
  },
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
        <Providers>
          {children}
          <FloatingLinksWrapper />
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
