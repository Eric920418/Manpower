import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ImageZoom from "@/components/Resume/ImageZoom";

// 強制動態渲染
export const dynamic = "force-dynamic";

interface Worker {
  id: string;
  name: string;
  foreignId?: string;
  age: number;
  gender: string;
  country: string;
  photo: string;
  experience: string;
  education?: string;
  height?: number;
  weight?: number;
  skills: string[];
  languages: string[];
  availability: string;
  category: string | string[]; // 支援單選和複選
  sourceType?: string;
  description: string;
  isNew?: boolean;
}

// 輔助函式：確保 category 是陣列格式
const ensureCategoryArray = (category: string | string[] | undefined): string[] => {
  if (!category) return [];
  if (Array.isArray(category)) return category;
  return category ? [category] : [];
};

async function getResumeDetailData(id: string) {
  const query = `
    query resumeDetailPage {
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
      workersPage {
        workers
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
      next: { revalidate: 300 },
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

    const workers = result.data?.workersPage?.[0]?.workers || [];
    const worker = workers.find((w: Worker) => w.id === id);

    return {
      page: result.data?.homePage[0] || null,
      navigations: result.data?.activeNavigations || [],
      worker: worker || null,
    };
  } catch (error) {
    console.error("獲取履歷詳細資料失敗：", error);
    throw error;
  }
}

// 國家對應顏色 - 使用品牌色系
const countryColors: Record<string, { bg: string; text: string }> = {
  印尼: { bg: "bg-brand-primary", text: "text-white" },
  菲律賓: { bg: "bg-brand-secondary", text: "text-white" },
  越南: { bg: "bg-brand-accent", text: "text-white" },
  泰國: { bg: "bg-[#5BA3C0]", text: "text-white" },
  印度: { bg: "bg-[#0D5A7A]", text: "text-white" },
};

export default async function ResumeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const { page: pageData, navigations, worker } = await getResumeDetailData(id);

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

    if (!worker) {
      return (
        <main className="relative flex w-full flex-col bg-bg-primary min-h-screen">
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

          <div className="flex-1 flex items-center justify-center pt-20">
            <div className="max-w-2xl p-8 text-center">
              <span className="material-symbols-outlined text-6xl text-text-secondary mb-4">
                person_off
              </span>
              <h1 className="text-2xl font-bold text-gray-800 mb-4">
                找不到此履歷
              </h1>
              <p className="text-gray-600 mb-6">
                編號 {id} 的履歷不存在或已被移除。
              </p>
              <Link
                href="/resume"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-accent transition-colors"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                返回人才列表
              </Link>
            </div>
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
    }

    const countryStyle = countryColors[worker.country] || {
      bg: "bg-gray-500",
      text: "text-white",
    };

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
        <div className="relative z-10 pt-24 pb-16 min-h-screen">
          <div className="container mx-auto px-4 max-w-5xl">
            {/* 返回按鈕 */}
            <Link
              href="/resume"
              className="inline-flex items-center gap-2 text-brand-secondary hover:text-brand-primary transition-colors mb-6"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              返回人才列表
            </Link>

            {/* 主要內容：左右佈局 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 左側：照片與基本資訊卡片 */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden sticky top-24">
                  {/* NEW 標籤 */}
                  {worker.isNew && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-red-500 text-white text-sm font-bold px-4 py-1.5 rounded shadow-md">
                        NEW
                      </span>
                    </div>
                  )}

                  {/* 照片 - hover 放大 */}
                  <ImageZoom
                    src={worker.photo || "/placeholder-avatar.png"}
                    alt={`${worker.name} 的照片`}
                    overlayInfo={{
                      name: worker.name,
                      country: worker.country,
                      countryStyle: countryStyle,
                      foreignId: worker.foreignId || worker.id,
                      age: worker.age,
                      education: worker.education || "未填寫",
                      height: worker.height || 0,
                      weight: worker.weight || 0,
                    }}
                  />

                  {/* 基本資訊 */}
                  <div className="p-6">
                    {/* 姓名 */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                      {worker.name}
                    </h1>

                    {/* 國籍標籤 */}
                    <div className="mb-4">
                      <span
                        className={`inline-block ${countryStyle.bg} ${countryStyle.text} text-sm font-bold px-4 py-1.5 rounded`}
                      >
                        {worker.country}
                      </span>
                    </div>

                    {/* 詳細資訊 */}
                    <div className="space-y-3 text-sm">
                      <div className="flex border-b border-gray-100 pb-2">
                        <span className="text-gray-500 w-24 shrink-0">外國人編號</span>
                        <span className="font-semibold text-gray-900">
                          {worker.foreignId || worker.id}
                        </span>
                      </div>
                      <div className="flex border-b border-gray-100 pb-2">
                        <span className="text-gray-500 w-24 shrink-0">年齡</span>
                        <span className="font-semibold text-gray-900">
                          {worker.age} 歲
                        </span>
                      </div>
                      <div className="flex border-b border-gray-100 pb-2">
                        <span className="text-gray-500 w-24 shrink-0">性別</span>
                        <span className="font-semibold text-gray-900">
                          {worker.gender}
                        </span>
                      </div>
                      <div className="flex border-b border-gray-100 pb-2">
                        <span className="text-gray-500 w-24 shrink-0">學歷</span>
                        <span className="font-semibold text-gray-900">
                          {worker.education || "未填寫"}
                        </span>
                      </div>
                      <div className="flex border-b border-gray-100 pb-2">
                        <span className="text-gray-500 w-24 shrink-0">身高/體重</span>
                        <span className="font-semibold text-gray-900">
                          {worker.height && worker.weight
                            ? `${worker.height}cm / ${worker.weight}kg`
                            : "未填寫"}
                        </span>
                      </div>
                      <div className="flex border-b border-gray-100 pb-2">
                        <span className="text-gray-500 w-24 shrink-0">工作類別</span>
                        <div className="flex flex-wrap gap-1">
                          {ensureCategoryArray(worker.category).length > 0 ? (
                            ensureCategoryArray(worker.category).map((cat, idx) => (
                              <span key={idx} className="font-semibold text-gray-900 bg-purple-100 px-2 py-0.5 rounded text-sm">
                                {cat}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400">未設定</span>
                          )}
                        </div>
                      </div>
                      {worker.sourceType && (
                        <div className="flex border-b border-gray-100 pb-2">
                          <span className="text-gray-500 w-24 shrink-0">來源類型</span>
                          <span className="font-semibold text-gray-900">
                            {worker.sourceType}
                          </span>
                        </div>
                      )}
                      <div className="flex">
                        <span className="text-gray-500 w-24 shrink-0">可上工</span>
                        <span className="font-semibold text-green-600">
                          {worker.availability}
                        </span>
                      </div>
                    </div>

                    {/* 選定按鈕 */}
                    <Link
                      href={`/resume/request?selected=${worker.id}`}
                      className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-brand-primary text-white rounded-lg font-bold hover:bg-brand-accent transition-colors shadow-md"
                    >
                      <span className="material-symbols-outlined">send</span>
                      選定此人才
                    </Link>
                  </div>
                </div>
              </div>

              {/* 右側：詳細內容 */}
              <div className="lg:col-span-2 space-y-6">
                {/* 工作經驗 */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary">
                      work_history
                    </span>
                    工作經驗
                  </h2>
                  <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-4">
                    <p className="text-lg font-semibold text-brand-secondary">
                      {worker.experience}
                    </p>
                  </div>
                </div>

                {/* 自我介紹 */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary">
                      info
                    </span>
                    自我介紹
                  </h2>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {worker.description || "暫無自我介紹"}
                  </p>
                </div>

                {/* 專業技能 */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary">
                      build
                    </span>
                    專業技能
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {worker.skills && worker.skills.length > 0 ? (
                      worker.skills.map((skill: string, index: number) => (
                        <span
                          key={index}
                          className="bg-brand-primary/10 text-brand-secondary px-4 py-2 rounded-full font-medium border border-brand-primary/20"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">暫無技能資料</p>
                    )}
                  </div>
                </div>

                {/* 語言能力 */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary">
                      translate
                    </span>
                    語言能力
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {worker.languages && worker.languages.length > 0 ? (
                      worker.languages.map((lang: string, index: number) => (
                        <span
                          key={index}
                          className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-medium border border-blue-200"
                        >
                          {lang}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">暫無語言資料</p>
                    )}
                  </div>
                </div>

                {/* 操作按鈕 */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/resume"
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                    返回列表
                  </Link>
                  <Link
                    href={`/resume/request?selected=${worker.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl hover:bg-brand-accent transition-colors font-semibold shadow-lg"
                  >
                    <span className="material-symbols-outlined">send</span>
                    提交人力需求
                  </Link>
                </div>
              </div>
            </div>
          </div>
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
              ⚠️ 履歷詳細頁面載入失敗
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
