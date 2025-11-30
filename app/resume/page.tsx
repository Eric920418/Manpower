import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ResumeGrid from "@/components/Resume/ResumeGrid";

// 強制動態渲染，避免 build 時 fetch 失敗
export const dynamic = 'force-dynamic';

async function getResumePageData() {
  const query = `
    query resumePage {
      homePage {
        header
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
        `❌ GraphQL API 請求失敗：HTTP ${res.status} ${res.statusText}`
      );
    }

    const result = await res.json();

    if (result.errors) {
      throw new Error(
        `❌ GraphQL 查詢錯誤：\n${JSON.stringify(result.errors, null, 2)}`
      );
    }

    return {
      page: result.data?.homePage[0] || null,
      navigations: result.data?.activeNavigations || [],
    };
  } catch (error) {
    console.error("獲取頁面資料失敗：", error);
    throw error;
  }
}

export default async function ResumePage() {
  try {
    const { page: pageData, navigations } = await getResumePageData();

    if (!pageData) {
      return (
        <main className="flex min-h-screen items-center justify-center">
          <div className="max-w-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              ⚠️ 無法載入頁面資料
            </h1>
            <p className="text-gray-600">
              資料庫中沒有找到相關內容。請先在後台設定資料。
            </p>
          </div>
        </main>
      );
    }

    return (
      <main className="relative flex w-full flex-col bg-bg-primary">
        {/* 固定背景 Logo */}
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{ opacity: 0.03 }}
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
          navigation={navigations.map(
            (nav: { label: string; url: string | null }) => ({
              label: nav.label,
              link: nav.url || "#",
            })
          )}
          contactButton={pageData.header.contactButton}
        />

        {/* 主要內容區 */}
        <div className="relative z-10 pt-20  min-h-screen">
          <ResumeGrid />
        </div>

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
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-lg p-8">
          <div className="border-l-4 border-red-500 pl-4 mb-6">
            <h1 className="text-3xl font-bold text-red-600 mb-2">
              ⚠️ 履歷頁面載入失敗
            </h1>
            <p className="text-gray-600">發生了以下錯誤，請檢查並修復：</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-red-800 mb-3">
              錯誤訊息：
            </h2>
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
        </div>
      </main>
    );
  }
}
