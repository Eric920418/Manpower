import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ApplicationProcessHero from "@/components/ApplicationProcess/ApplicationProcessHero";
import ProcessSteps from "@/components/ApplicationProcess/ProcessSteps";
import ProcessCTA from "@/components/ApplicationProcess/ProcessCTA";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = {
  title: "申請流程",
  description: "了解外籍勞工申請流程，包含看護工、幫傭、廠工、營造工、養護機構等不同工作類別的專業申請流程指引。",
  openGraph: {
    title: "申請流程 | 佑羲人力",
    description: "了解外籍勞工申請流程，包含看護工、幫傭、廠工、營造工等不同工作類別的專業申請流程指引。",
    type: "website",
  },
};

// 強制動態渲染，避免 build 時 fetch 失敗
export const dynamic = 'force-dynamic';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  steps: Array<{
    number: number;
    title: string;
    description: string;
    icon: string;
  }>;
}

async function getPageData(category?: string) {
  const query = `
    query getApplicationProcessPage {
      homePage {
        header
        footer
      }
      applicationProcessPage {
        hero
        categories
        contactCTA
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

  const categories: Category[] = data?.applicationProcessPage[0]?.categories || [];
  const selectedCategory = category
    ? categories.find((cat: Category) => cat.id === category)
    : null;

  return {
    header: data?.homePage[0]?.header || null,
    footer: data?.homePage[0]?.footer || null,
    pageData: data?.applicationProcessPage[0] || null,
    navigations: data?.activeNavigations || [],
    categories,
    selectedCategory,
  };
}

export default async function ApplicationProcessPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const category = params.category;

  const { header, footer, pageData, navigations, categories, selectedCategory } =
    await getPageData(category);

  if (!header || !footer || !pageData) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">載入中...</p>
      </main>
    );
  }

  // 如果有指定 category 但找不到，重定向回申請流程首頁
  if (category && !selectedCategory) {
    redirect("/application-process");
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

      {/* Hero 區塊 - 根據是否有選擇類別顯示不同內容 */}
      {selectedCategory ? (
        <section className="relative py-20 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              {/* 返回按鈕 */}
              <Link
                href="/application-process"
                className="inline-flex items-center gap-2 text-brand-primary hover:text-brand-accent mb-6 transition-colors"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                返回選擇工作類別
              </Link>

              {/* 類別圖標與標題 */}
              <div className="mb-6">
                <div
                  className={`inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br ${selectedCategory.color} rounded-3xl shadow-2xl mb-4`}
                >
                  <span className="material-symbols-outlined text-5xl text-white">
                    {selectedCategory.icon}
                  </span>
                </div>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">
                {selectedCategory.name} - 申請流程
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                {selectedCategory.description}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <ApplicationProcessHero
          title={pageData.hero.title}
          description={pageData.hero.description}
          image={pageData.hero.image}
        />
      )}

      {/* 步驟顯示 */}
      {selectedCategory ? (
        <ProcessSteps steps={selectedCategory.steps} />
      ) : (
        // 如果沒有選擇類別，顯示所有類別供選擇
        <section className="py-24 bg-white">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-gray-800 mb-4">
                選擇您的工作類別
              </h2>
              <p className="text-gray-600 text-lg">
                不同工作類別有不同的申請流程，請先選擇您要申請的類別
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {categories.map((cat: Category) => (
                <Link
                  key={cat.id}
                  href={`/application-process?category=${cat.id}`}
                  className="group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:-translate-y-2"
                >
                  <div className={`p-8 bg-gradient-to-br ${cat.color} bg-opacity-10`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`w-16 h-16 bg-gradient-to-br ${cat.color} rounded-2xl flex items-center justify-center shadow-lg`}
                      >
                        <span className="material-symbols-outlined text-3xl text-white">
                          {cat.icon}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-text-on-brand">{cat.name}</h3>
                        <p className="text-sm text-text-on-brand">{cat.steps.length} 個步驟</p>
                      </div>
                    </div>

                    <p className="text-text-on-brand mb-4">{cat.description}</p>

                    <div className="flex items-center justify-between text-brand-primary group-hover:text-brand-accent transition-colors">
                      <span className="font-semibold text-text-on-brand">查看申請流程</span>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <ProcessCTA
        title={pageData.contactCTA.title}
        description={pageData.contactCTA.description}
        buttonText={pageData.contactCTA.buttonText}
        buttonLink={pageData.contactCTA.buttonLink}
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
