import Image from "next/image";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import FeaturedTalents from "@/components/FeaturedTalents";
import NewsSection from "@/components/NewsSection";
import Footer from "@/components/Footer";

// 強制動態渲染，避免 build 時 fetch 失敗
export const dynamic = 'force-dynamic';

async function getHomePageData() {
  const query = `
    query homePage {
      homePage {
        header
        hero
        featuredTalents
        newsSection
        footer
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

  try {
    const apiUrl = process.env.NEXTAUTH_URL + "/api/graphql";

    if (!process.env.NEXTAUTH_URL) {
      throw new Error("❌ 環境變數錯誤：NEXTAUTH_URL 未設定");
    }

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      next: { revalidate: 300 }, // ISR: 每 5 分鐘重新驗證
    });

    if (!res.ok) {
      throw new Error(
        `❌ GraphQL API 請求失敗：HTTP ${res.status} ${res.statusText}\n` +
        `請求網址：${apiUrl}\n` +
        `請確認：\n` +
        `1. 開發伺服器是否正常運行\n` +
        `2. NEXTAUTH_URL 環境變數是否正確設定為 ${process.env.NEXTAUTH_URL}\n` +
        `3. GraphQL API 端點是否可以訪問`
      );
    }

    const contentType = res.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await res.text();
      throw new Error(
        `❌ GraphQL API 返回了非 JSON 格式的內容\n` +
        `Content-Type: ${contentType}\n` +
        `返回內容的前 200 字元：\n${text.substring(0, 200)}`
      );
    }

    const result = await res.json();

    if (result.errors) {
      throw new Error(
        `❌ GraphQL 查詢錯誤：\n${JSON.stringify(result.errors, null, 2)}`
      );
    }

    if (!result.data) {
      throw new Error(
        `❌ GraphQL 返回的資料格式錯誤：\n${JSON.stringify(result, null, 2)}`
      );
    }

    return {
      page: result.data?.homePage[0] || null,
      navigations: result.data?.activeNavigations || [],
    };
  } catch (error) {
    console.error("獲取首頁資料失敗：", error);
    throw error;
  }
}

export default async function Home() {
  try {
    const { page: pageData, navigations } = await getHomePageData();

    if (!pageData) {
      return (
        <main className="flex min-h-screen items-center justify-center">
          <div className="max-w-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">⚠️ 無法載入首頁資料</h1>
            <p className="text-gray-600">資料庫中沒有找到首頁內容。請先在後台設定首頁資料。</p>
          </div>
        </main>
      );
    }

    return (
      <main className="relative flex min-h-screen w-full flex-col">
        {/* 固定背景 Logo - 视差效果 */}
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{ opacity: 0.05 }}
        >
          <Image
            src="/logo.png"
            alt="佑羲人力背景 Logo"
            width={600}
            height={600}
            className="w-[50vw] max-w-3xl h-auto object-contain"
            priority={false}
          />
        </div>

        <Header
          logo={pageData.header.logo}
          navigation={navigations.map((nav: { label: string; url: string | null }) => ({
            label: nav.label,
            link: nav.url || "#",
          }))}
          contactButton={pageData.header.contactButton}
        />
        <Hero
          badge={pageData.hero.badge}
          title={pageData.hero.title}
          description={pageData.hero.description}
          primaryCTA={pageData.hero.primaryCTA}
          secondaryCTA={pageData.hero.secondaryCTA}
          image={pageData.hero.image}
        />
        <FeaturedTalents
          badge={pageData.featuredTalents.badge}
          title={pageData.featuredTalents.title}
          description={pageData.featuredTalents.description}
          stats={pageData.featuredTalents.stats}
          talents={pageData.featuredTalents.talents}
          ctaText={pageData.featuredTalents.ctaText}
          ctaLink={pageData.featuredTalents.ctaLink}
        />
        <NewsSection
          title={pageData.newsSection.title}
          description={pageData.newsSection.description}
          categories={pageData.newsSection.categories}
          featuredArticle={pageData.newsSection.featuredArticle}
          articles={pageData.newsSection.articles}
        />
        <Footer
          logo={pageData.footer.logo}
          contact={pageData.footer.contact}
          socialMedia={pageData.footer.socialMedia}
          quickLinks={pageData.footer.quickLinks}
          map={pageData.footer.map}
          copyright={pageData.footer.copyright}
          bottomLinks={pageData.footer.bottomLinks}
        />
      </main>
    );
  } catch (error) {
    // 完整錯誤顯示在前端
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-8">
          <div className="border-l-4 border-red-500 pl-4 mb-6">
            <h1 className="text-3xl font-bold text-red-600 mb-2">⚠️ 首頁載入失敗</h1>
            <p className="text-gray-600">發生了以下錯誤，請檢查並修復：</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-red-800 mb-3">錯誤訊息：</h2>
            <pre className="text-sm text-red-700 whitespace-pre-wrap break-words font-mono bg-white p-4 rounded border border-red-300 overflow-x-auto">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          </div>

          {error instanceof Error && error.stack && (
            <details className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <summary className="cursor-pointer text-gray-700 font-semibold hover:text-gray-900">
                📋 詳細堆疊追蹤 (Stack Trace)
              </summary>
              <pre className="mt-4 text-xs text-gray-600 whitespace-pre-wrap break-words font-mono bg-white p-4 rounded border border-gray-200 overflow-x-auto">
                {error.stack}
              </pre>
            </details>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🔧 常見解決方法：</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>確認開發伺服器正在運行（<code className="bg-gray-100 px-2 py-1 rounded">pnpm dev</code>）</li>
              <li>檢查 <code className="bg-gray-100 px-2 py-1 rounded">.env</code> 檔案中的 <code className="bg-gray-100 px-2 py-1 rounded">NEXTAUTH_URL</code> 是否設定正確</li>
              <li>確認資料庫連線正常（<code className="bg-gray-100 px-2 py-1 rounded">DATABASE_URL</code>）</li>
              <li>檢查 GraphQL API 端點 <code className="bg-gray-100 px-2 py-1 rounded">/api/graphql</code> 是否可以訪問</li>
              <li>查看終端機 console 是否有更多錯誤訊息</li>
            </ul>
          </div>
        </div>
      </main>
    );
  }
}
