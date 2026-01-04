import { Metadata } from "next";

export const metadata: Metadata = {
  title: "常見問題",
  description: "外籍勞工申請常見問題解答，包含申請流程、法規相關、合約條款等疑問，佑羲人力專業團隊為您詳細解說。",
  openGraph: {
    title: "常見問題 | 佑羲人力",
    description: "外籍勞工申請常見問題解答，包含申請流程、法規相關、合約條款等疑問。",
    type: "website",
  },
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
