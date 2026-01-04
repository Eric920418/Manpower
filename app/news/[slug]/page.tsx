import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/SEO/JsonLd";
import { NewsContentStyles } from "@/components/News/NewsContentStyles";

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

interface PageProps {
  params: Promise<{ slug: string }>;
}

// 獲取新聞資料
async function getNewsData(slug: string) {
  try {
    const apiUrl = process.env.NEXTAUTH_URL + "/api/graphql";

    if (!process.env.NEXTAUTH_URL) {
      return null;
    }

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

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const { data, errors } = await res.json();

    if (errors || !data) {
      return null;
    }

    const headerData = data.homePage[0]?.header;
    const footerData = data.homePage[0]?.footer;
    const navigations = data.activeNavigations || [];
    const pageData: PageData = data.newsPage[0];

    // 搜尋符合 slug 的新聞
    let news: News | null = null;
    const featuredSlug = pageData.featuredNews?.slug || "featured";

    if (pageData.featuredNews && featuredSlug === slug) {
      news = pageData.featuredNews;
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
        news = foundNews;
      }
    }

    return {
      news,
      headerData,
      footerData,
      navigations,
    };
  } catch {
    return null;
  }
}

// 動態生成 Metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getNewsData(slug);

  if (!data?.news) {
    return {
      title: "找不到此新聞",
      description: "您所尋找的新聞不存在或已被移除。",
    };
  }

  const { news } = data;
  const siteUrl = process.env.NEXTAUTH_URL || "https://yoshi3166.com";

  return {
    title: news.title,
    description: news.excerpt,
    openGraph: {
      title: news.title,
      description: news.excerpt,
      type: "article",
      url: `${siteUrl}/news/${slug}`,
      images: [
        {
          url: news.image,
          width: 1200,
          height: 630,
          alt: news.title,
        },
      ],
      publishedTime: news.date,
      section: news.category,
    },
    twitter: {
      card: "summary_large_image",
      title: news.title,
      description: news.excerpt,
      images: [news.image],
    },
    alternates: {
      canonical: `${siteUrl}/news/${slug}`,
    },
  };
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getNewsData(slug);

  if (!data?.news) {
    notFound();
  }

  const { news, headerData, footerData, navigations } = data;
  const siteUrl = process.env.NEXTAUTH_URL || "https://yoshi3166.com";

  return (
    <main className="relative flex min-h-screen w-full flex-col">
      {/* JSON-LD 結構化數據 */}
      <ArticleJsonLd
        title={news.title}
        description={news.excerpt}
        url={`${siteUrl}/news/${slug}`}
        image={news.image}
        datePublished={news.date}
        authorName="佑羲人力"
        publisherName="佑羲人力"
        publisherLogo={`${siteUrl}/logo.png`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "首頁", url: siteUrl },
          { name: "最新消息", url: `${siteUrl}/news` },
          { name: news.title, url: `${siteUrl}/news/${slug}` },
        ]}
      />

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
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(news.content) }}
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
      <NewsContentStyles />

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
