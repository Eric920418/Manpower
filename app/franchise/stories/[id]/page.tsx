import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import DOMPurify from "isomorphic-dompurify";

export const dynamic = "force-dynamic";

interface Story {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  date: string;
  category: string;
  description: string;
  content: string;
  youtubeUrl?: string;
}

async function getPageData(storyId: string) {
  const query = `
    query franchiseStoryQuery {
      homePage {
        header
        footer
      }
      franchisePage {
        franchiseeSharing
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
    next: { revalidate: 300 },
  });

  const { data } = await res.json();
  const franchiseeSharing = data?.franchisePage[0]?.franchiseeSharing || {};
  const stories: Story[] = franchiseeSharing?.stories || [];
  const story = stories.find((s) => s.id === storyId);

  return {
    header: data?.homePage[0]?.header || null,
    footer: data?.homePage[0]?.footer || null,
    navigations: data?.activeNavigations || [],
    story,
    allStories: stories,
  };
}

// 從 YouTube URL 提取影片 ID
function getYoutubeVideoId(url: string): string {
  if (!url) return "";
  if (url.includes("watch?v=")) {
    return url.split("watch?v=")[1]?.split("&")[0] || "";
  }
  if (url.includes("youtu.be/")) {
    return url.split("youtu.be/")[1]?.split("?")[0] || "";
  }
  if (url.includes("embed/")) {
    return url.split("embed/")[1]?.split("?")[0] || "";
  }
  return "";
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { header, footer, navigations, story, allStories } = await getPageData(id);

  if (!header || !footer) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">載入中...</p>
      </main>
    );
  }

  if (!story) {
    return (
      <main className="flex min-h-screen flex-col">
        <Header
          logo={header.logo}
          navigation={navigations.map((nav: { label: string; url: string | null }) => ({
            label: nav.label,
            link: nav.url || "#",
          }))}
          contactButton={header.contactButton}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">找不到文章</h1>
            <Link
              href="/franchise"
              className="text-brand-primary hover:underline"
            >
              返回加盟頁面
            </Link>
          </div>
        </div>
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

  // 取得其他推薦文章（排除當前文章）
  const otherStories = allStories.filter((s) => s.id !== id).slice(0, 3);
  const videoId = getYoutubeVideoId(story.youtubeUrl || "");

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

      {/* Hero 區塊 */}
      <section className="relative pt-20">
        {/* 封面圖片 */}
        <div className="relative h-[400px] md:h-[500px] w-full">
          {story.image ? (
            <Image
              src={story.image}
              alt={story.title}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* 標題區塊 */}
          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
            <div className="container mx-auto">
              <div className="flex items-center gap-3 text-white/80 text-sm mb-4">
                <Link href="/franchise" className="hover:text-white transition">
                  創業加盟
                </Link>
                <span>/</span>
                <span>加盟主分享</span>
              </div>
              <span className="text-sm text-white/70 mb-2 block">
                {story.subtitle}
              </span>
              <h1
                className="text-3xl md:text-5xl font-bold mb-4"
                style={{
                  background:
                    "linear-gradient(135deg, #d4a853 0%, #f5d98a 50%, #d4a853 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {story.title}
              </h1>
              <div className="flex items-center gap-4 text-white/70 text-sm">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">
                    calendar_month
                  </span>
                  {story.date}
                </span>
                <span className="text-brand-primary font-medium">
                  {story.category}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 文章內容 */}
      <article className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            {/* 摘要 */}
            <p className="text-xl text-gray-600 leading-relaxed mb-8 pb-8 border-b border-gray-200">
              {story.description}
            </p>

            {/* 文章內容 */}
            <div
              className="prose prose-lg max-w-none prose-headings:text-gray-800 prose-p:text-gray-600 prose-a:text-brand-primary"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(story.content || ""),
              }}
            />

            {/* YouTube 影片（放在文章最下面） */}
            {videoId && (
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                  影片分享
                </h3>
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-xl bg-gray-900">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={story.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* 其他推薦文章 */}
      {otherStories.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-8">
              其他加盟主分享
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {otherStories.map((s) => (
                <Link
                  key={s.id}
                  href={`/franchise/stories/${s.id}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {s.image ? (
                      <Image
                        src={s.image}
                        alt={s.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-6xl text-gray-400">
                          person
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3
                        className="text-xl font-bold"
                        style={{
                          background:
                            "linear-gradient(135deg, #d4a853 0%, #f5d98a 50%, #d4a853 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        {s.title}
                      </h3>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {s.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 返回按鈕 */}
      <div className="py-8 bg-white">
        <div className="container mx-auto px-6 text-center">
          <Link
            href="/franchise"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-full font-medium hover:bg-brand-primary/90 transition"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            返回加盟頁面
          </Link>
        </div>
      </div>

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
