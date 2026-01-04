import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FranchiseHero from "@/components/Franchise/FranchiseHero";
import FranchisePageContent from "@/components/Franchise/FranchisePageContent";

export const metadata: Metadata = {
  title: "創業加盟",
  description: "加入佑羲人力創業加盟計劃，掌握長照市場商機。我們提供全程教育訓練、品質管控支持、多角化業務機會，是您穩健創業的最佳夥伴。",
  openGraph: {
    title: "創業加盟 | 佑羲人力",
    description: "加入佑羲人力創業加盟計劃，掌握長照市場商機。全程教育訓練、品質管控支持。",
    type: "website",
  },
};

// 強制動態渲染，避免 build 時 fetch 失敗
export const dynamic = 'force-dynamic';

async function getPageData() {
  const query = `
    query franchisePageQuery {
      homePage {
        header
        footer
      }
      franchisePage {
        hero
        marketOpportunity
        partnershipAdvantages
        franchiseProcess
        franchiseeSharing
        cta
      }
      activeNavigations {
        id
        label
        url
        icon
        target
        children {
          id
          label
          url
          icon
          target
        }
      }
    }
  `;

  const res = await fetch(process.env.NEXTAUTH_URL + "/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    next: { revalidate: 300 }, // ISR: 每 5 分鐘重新驗證
  });

  const { data } = await res.json();
  return {
    header: data?.homePage[0]?.header || null,
    footer: data?.homePage[0]?.footer || null,
    franchisePage: data?.franchisePage[0] || null,
    navigations: data?.activeNavigations || [],
  };
}

export default async function FranchisePage() {
  const { header, footer, navigations, franchisePage } = await getPageData();

  if (!header || !footer) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">載入中...</p>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col">
      <Header
        logo={header.logo}
        navigation={navigations.map((nav: { label: string; url: string | null }) => ({
          label: nav.label,
          link: nav.url || "#",
        }))}
        contactButton={header.contactButton}
      />

      <FranchiseHero data={franchisePage?.hero} />
      <FranchisePageContent franchisePage={franchisePage} />

      <Footer
        logo={footer.logo}
        contact={footer.contact}
        socialMedia={footer.socialMedia}
        quickLinks={footer.quickLinks}
        map={footer.map}
        copyright={footer.copyright}
        bottomLinks={footer.bottomLinks}
      />
    </main>
  );
}
