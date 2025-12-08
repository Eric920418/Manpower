import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// 強制動態渲染
export const dynamic = "force-dynamic";

interface Worker {
  id: string;
  name: string;
  age: number;
  gender: string;
  country: string;
  photo: string;
  experience: string;
  skills: string[];
  languages: string[];
  availability: string;
  category: string;
  description: string;
}

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
          <div className="container mx-auto px-4 max-w-4xl">
            {/* 返回按鈕 */}
            <Link
              href="/resume"
              className="inline-flex items-center gap-2 text-brand-secondary hover:text-brand-primary transition-colors mb-6"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              返回人才列表
            </Link>

            {/* 履歷卡片 */}
            <div className="bg-white rounded-2xl shadow-xl border border-border overflow-hidden">
              {/* 頭部區域 */}
              <div className="bg-gradient-to-r from-brand-primary to-brand-accent p-8 text-white">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* 照片 */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-white/30 shadow-lg">
                      <Image
                        src={worker.photo || "/placeholder-avatar.png"}
                        alt={`${worker.name} 的照片`}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-white text-brand-primary px-3 py-1 rounded-full text-sm font-bold shadow-md">
                      {worker.id}
                    </div>
                  </div>

                  {/* 基本資訊 */}
                  <div className="text-center md:text-left flex-1">
                    <h1 className="text-3xl font-bold mb-2">{worker.name}</h1>
                    <p className="text-xl text-white/90 mb-3">{worker.category}</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 text-white/80">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-lg">
                          location_on
                        </span>
                        {worker.country}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-lg">
                          person
                        </span>
                        {worker.gender} · {worker.age}歲
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-lg">
                          work_history
                        </span>
                        {worker.experience}
                      </span>
                    </div>
                  </div>

                  {/* 狀態標籤 */}
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-center">
                    <p className="text-sm text-white/80">可上工時間</p>
                    <p className="text-lg font-bold">{worker.availability}</p>
                  </div>
                </div>
              </div>

              {/* 詳細內容 */}
              <div className="p-8 space-y-8">
                {/* 自我介紹 */}
                <section>
                  <h2 className="text-xl font-bold text-brand-secondary mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary">
                      info
                    </span>
                    自我介紹
                  </h2>
                  <p className="text-text-secondary leading-relaxed bg-gray-50 p-4 rounded-lg">
                    {worker.description || "暫無自我介紹"}
                  </p>
                </section>

                {/* 專業技能 */}
                <section>
                  <h2 className="text-xl font-bold text-brand-secondary mb-4 flex items-center gap-2">
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
                          className="bg-brand-primary/10 text-brand-secondary px-4 py-2 rounded-full font-medium border border-brand-primary/20 hover:bg-brand-primary/20 transition-colors"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <p className="text-text-secondary">暫無技能資料</p>
                    )}
                  </div>
                </section>

                {/* 語言能力 */}
                <section>
                  <h2 className="text-xl font-bold text-brand-secondary mb-4 flex items-center gap-2">
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
                      <p className="text-text-secondary">暫無語言資料</p>
                    )}
                  </div>
                </section>

                {/* 詳細資訊表格 */}
                <section>
                  <h2 className="text-xl font-bold text-brand-secondary mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary">
                      assignment
                    </span>
                    詳細資訊
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-text-secondary mb-1">編號</p>
                      <p className="font-semibold text-text-primary">{worker.id}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-text-secondary mb-1">姓名</p>
                      <p className="font-semibold text-text-primary">{worker.name}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-text-secondary mb-1">年齡</p>
                      <p className="font-semibold text-text-primary">{worker.age}歲</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-text-secondary mb-1">性別</p>
                      <p className="font-semibold text-text-primary">{worker.gender}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-text-secondary mb-1">國籍</p>
                      <p className="font-semibold text-text-primary">{worker.country}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-text-secondary mb-1">工作類別</p>
                      <p className="font-semibold text-text-primary">{worker.category}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-text-secondary mb-1">工作經驗</p>
                      <p className="font-semibold text-text-primary">{worker.experience}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-text-secondary mb-1">可上工時間</p>
                      <p className="font-semibold text-text-primary">{worker.availability}</p>
                    </div>
                  </div>
                </section>

                {/* 操作按鈕 */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-border">
                  <Link
                    href="/resume"
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-brand-primary text-brand-primary rounded-lg hover:bg-brand-primary/10 transition-colors font-semibold"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                    返回列表
                  </Link>
                  <Link
                    href={`/resume/request?selected=${worker.id}`}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-accent transition-colors font-semibold shadow-lg"
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
