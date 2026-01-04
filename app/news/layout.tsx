import { Metadata } from "next";

export const metadata: Metadata = {
  title: "最新消息",
  description: "掌握佑羲人力最新的產業動態、外籍勞工政策更新、成功案例分享及活動訊息，讓您隨時了解人力仲介最新資訊。",
  openGraph: {
    title: "最新消息 | 佑羲人力",
    description: "掌握佑羲人力最新的產業動態、外籍勞工政策更新、成功案例分享及活動訊息。",
    type: "website",
  },
};

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
