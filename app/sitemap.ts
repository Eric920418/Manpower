import { MetadataRoute } from "next";

// 獲取新聞列表
async function getNewsData() {
  try {
    const apiUrl = process.env.NEXTAUTH_URL + "/api/graphql";
    if (!process.env.NEXTAUTH_URL) return { featuredNews: null, newsList: [] };

    const query = `
      query getNewsForSitemap {
        newsPage {
          featuredNews
          newsList
        }
      }
    `;

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      cache: "no-store",
    });

    if (!res.ok) return { featuredNews: null, newsList: [] };

    const { data } = await res.json();
    const pageData = data?.newsPage?.[0];

    return {
      featuredNews: pageData?.featuredNews || null,
      newsList: pageData?.newsList || [],
    };
  } catch {
    return { featuredNews: null, newsList: [] };
  }
}

// 獲取加盟主故事
async function getFranchiseStories() {
  try {
    const apiUrl = process.env.NEXTAUTH_URL + "/api/graphql";
    if (!process.env.NEXTAUTH_URL) return [];

    const query = `
      query getFranchiseForSitemap {
        franchisePage {
          franchiseeSharing
        }
      }
    `;

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      cache: "no-store",
    });

    if (!res.ok) return [];

    const { data } = await res.json();
    return data?.franchisePage?.[0]?.franchiseeSharing?.stories || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXTAUTH_URL || "https://yoshi3166.com";

  // 靜態頁面
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/news`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/workers`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/resume`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/franchise`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/application-process`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/staff`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // 動態新聞頁面
  const newsData = await getNewsData();
  const newsPages: MetadataRoute.Sitemap = [];

  // 精選新聞
  if (newsData.featuredNews) {
    const slug = newsData.featuredNews.slug || "featured";
    newsPages.push({
      url: `${siteUrl}/news/${slug}`,
      lastModified: new Date(newsData.featuredNews.date || new Date()),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  // 新聞列表
  newsData.newsList.forEach((news: { slug?: string; date?: string }, index: number) => {
    const slug = news.slug || `item-${index}`;
    newsPages.push({
      url: `${siteUrl}/news/${slug}`,
      lastModified: new Date(news.date || new Date()),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  });

  // 加盟主故事頁面
  const stories = await getFranchiseStories();
  const storyPages: MetadataRoute.Sitemap = stories.map((story: { id: string; date?: string }) => ({
    url: `${siteUrl}/franchise/stories/${story.id}`,
    lastModified: new Date(story.date || new Date()),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...newsPages, ...storyPages];
}
