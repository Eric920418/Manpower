import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FranchiseHero from "@/components/Franchise/FranchiseHero";
import FranchiseNavButtons from "@/components/Franchise/FranchiseNavButtons";
import MarketOpportunity from "@/components/Franchise/MarketOpportunity";
import PartnershipAdvantages from "@/components/Franchise/PartnershipAdvantages";
import FranchiseProcess from "@/components/Franchise/FranchiseProcess";
import FranchiseCTA from "@/components/Franchise/FranchiseCTA";

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
      <FranchiseNavButtons />
      <MarketOpportunity data={franchisePage?.marketOpportunity} />
      <PartnershipAdvantages data={franchisePage?.partnershipAdvantages} />
      <FranchiseProcess data={franchisePage?.franchiseProcess} />
      <FranchiseCTA data={franchisePage?.cta} />

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
