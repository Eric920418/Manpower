"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface News {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image: string;
  date: string;
  category: string;
  link: string;
}

interface PageData {
  featuredNews: News;
  newsList: News[];
}

export default function NewsDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [news, setNews] = useState<News | null>(null);
  const [headerData, setHeaderData] = useState<any>(null);
  const [footerData, setFooterData] = useState<any>(null);
  const [navigations, setNavigations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = `
          query getNewsDetail {
            homePage {
              header
              footer
            }
            newsPage {
              featuredNews
              newsList
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

        const res = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        const { data, errors } = await res.json();

        if (errors) {
          setError("載入資料時發生錯誤");
          return;
        }

        if (data) {
          setHeaderData(data.homePage[0]?.header);
          setFooterData(data.homePage[0]?.footer);
          setNavigations(data.activeNavigations || []);

          // 搜尋符合 slug 的新聞
          const pageData: PageData = data.newsPage[0];

          // 先檢查精選新聞
          const featuredSlug = pageData.featuredNews?.slug || "featured";
          if (pageData.featuredNews && featuredSlug === slug) {
            setNews(pageData.featuredNews);
          } else {
            // 再檢查新聞列表（支援實際 slug 或 fallback 的 item-{index} 格式）
            let foundNews = pageData.newsList?.find((n: News) => n.slug === slug);

            // 如果沒找到，嘗試用 item-{index} 格式匹配
            if (!foundNews && slug.startsWith("item-")) {
              const indexStr = slug.replace("item-", "");
              const index = parseInt(indexStr, 10);
              if (!isNaN(index) && pageData.newsList && pageData.newsList[index]) {
                foundNews = pageData.newsList[index];
              }
            }

            if (foundNews) {
              setNews(foundNews);
            } else {
              setError("找不到此新聞");
            }
          }
        }
      } catch (err) {
        setError("載入資料時發生錯誤：" + err);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchData();
    }
  }, [slug]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-lg text-gray-600">載入中...</p>
        </div>
      </main>
    );
  }

  if (error || !news) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4 block">
            error
          </span>
          <p className="text-xl text-gray-600 mb-4">{error || "找不到此新聞"}</p>
          <Link
            href="/news"
            className="inline-flex items-center gap-2 bg-brand-primary text-white px-6 py-3 rounded-full font-semibold hover:bg-brand-primary/90 transition-all"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>返回新聞列表</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col">
      {headerData && (
        <Header
          logo={headerData.logo}
          navigation={navigations.map((nav: { label: string; url: string | null }) => ({
            label: nav.label,
            link: nav.url || "#",
          }))}
          contactButton={headerData.contactButton}
        />
      )}

      {/* Hero Section */}
      <section className="relative h-[400px] md:h-[500px]">
        <Image
          src={news.image}
          alt={news.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center gap-4 mb-4">
              <span className="px-4 py-2 bg-brand-primary text-white rounded-full text-sm font-medium">
                {news.category}
              </span>
              <span className="text-white/80 text-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-base">calendar_today</span>
                {news.date}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white">
              {news.title}
            </h1>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
            <Link href="/" className="hover:text-brand-primary transition-colors">
              首頁
            </Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <Link href="/news" className="hover:text-brand-primary transition-colors">
              最新消息
            </Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-gray-800">{news.title}</span>
          </nav>

          {/* Article Content */}
          <article className="prose prose-lg max-w-none">
            <div
              className="news-content"
              dangerouslySetInnerHTML={{ __html: news.content }}
            />
          </article>

          {/* Back Button */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link
              href="/news"
              className="inline-flex items-center gap-2 text-brand-primary font-medium hover:gap-3 transition-all"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>返回新聞列表</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Custom Styles for News Content */}
      <style jsx global>{`
        .news-content h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #1a1a1a;
        }
        .news-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #2a2a2a;
        }
        .news-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: #3a3a3a;
        }
        .news-content p {
          margin-bottom: 1rem;
          line-height: 1.8;
          color: #4a4a4a;
        }
        .news-content ul, .news-content ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .news-content li {
          margin-bottom: 0.5rem;
          line-height: 1.7;
        }
        .news-content blockquote {
          border-left: 4px solid #e5e5e5;
          padding-left: 1rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: #666;
        }
        .news-content img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1.5rem 0;
        }
        .news-content a {
          color: var(--brand-primary, #3b82f6);
          text-decoration: underline;
        }
        .news-content a:hover {
          text-decoration: none;
        }
        .news-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
        }
        .news-content th, .news-content td {
          border: 1px solid #e5e5e5;
          padding: 0.75rem;
          text-align: left;
        }
        .news-content th {
          background-color: #f5f5f5;
          font-weight: 600;
        }
      `}</style>

      {footerData && (
        <Footer
          logo={footerData.logo}
          contact={footerData.contact}
          socialMedia={footerData.socialMedia}
          quickLinks={footerData.quickLinks}
          map={footerData.map}
          copyright={footerData.copyright}
          bottomLinks={footerData.bottomLinks}
        />
      )}
    </main>
  );
}
