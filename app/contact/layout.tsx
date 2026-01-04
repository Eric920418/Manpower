import { Metadata } from "next";

export const metadata: Metadata = {
  title: "聯絡我們",
  description: "聯繫佑羲人力專業團隊，我們提供外籍勞工仲介諮詢服務，包含雇主服務、求職諮詢、加盟合作等，歡迎來電或線上諮詢。",
  openGraph: {
    title: "聯絡我們 | 佑羲人力",
    description: "聯繫佑羲人力專業團隊，我們提供外籍勞工仲介諮詢服務。",
    type: "website",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
