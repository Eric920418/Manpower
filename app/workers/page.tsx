import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WorkersHero from "@/components/Workers/WorkersHero";
import WorkersList from "@/components/Workers/WorkersList";
import WorkersCTA from "@/components/Workers/WorkersCTA";

// 強制動態渲染，避免 build 時 fetch 失敗
export const dynamic = 'force-dynamic';

async function getPageData() {
  const query = `
    query getWorkersPage {
      homePage {
        header
        footer
      }
      workersPage {
        hero
        filterOptions
        workers
        ctaSection
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
    pageData: data?.workersPage[0] || null,
    navigations: data?.activeNavigations || [],
  };
}

export default async function WorkersPage() {
  const { header, footer, pageData, navigations } = await getPageData();

  if (!header || !footer || !pageData) {
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

      <WorkersHero
        title={pageData.hero.title}
        description={pageData.hero.description}
        image={pageData.hero.image}
      />

      <WorkersList
        workers={pageData.workers}
        filterOptions={pageData.filterOptions}
      />

      <WorkersCTA
        title={pageData.ctaSection.title}
        description={pageData.ctaSection.description}
        buttonText={pageData.ctaSection.buttonText}
        buttonLink={pageData.ctaSection.buttonLink}
      />

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
