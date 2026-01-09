"use client";
import { gql } from "graphql-tag";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ImageUploader } from "@/components/Admin/ImageUploader";
import { useSession } from "next-auth/react";
import { graphqlRequest } from "@/utils/graphqlClient";

const CustomEditor = dynamic(() => import("@/components/CustomEditor"), {
  ssr: false,
  loading: () => <div className="h-[300px] bg-gray-100 animate-pulse rounded-lg" />,
});

// 將標題轉換為 URL-safe 的 slug
const generateSlug = (title: string): string => {
  if (!title) return `news-${Date.now()}`;
  // 移除特殊字符，保留中文、英文、數字
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, "") // 保留中英文、數字、空格、連字符
    .replace(/\s+/g, "-") // 空格轉為連字符
    .replace(/-+/g, "-") // 多個連字符合併
    .substring(0, 50) // 限制長度
    || `news-${Date.now()}`; // 備用方案
};

const UPDATE_PAGE = gql`
  mutation UpdateNewsPage($input: UpdateNewsPageInput!) {
    updateNewsPage(input: $input) {
      hero
      categories
      featuredNews
      newsList
    }
  }
`;

const query = `
  query newsPage {
    newsPage {
      hero
      categories
      featuredNews
      newsList
    }
  }
`;

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
  hero: {
    title: string;
    description: string;
  };
  categories: string[];
  featuredNews: News;
  newsList: News[];
}

export const NewsPage = () => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [pageData, setPageData] = useState<PageData>({
    hero: { title: "", description: "" },
    categories: [],
    featuredNews: { title: "", slug: "", excerpt: "", content: "", image: "", date: "", category: "", link: "" },
    newsList: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const { data } = await res.json();

      if (data?.newsPage[0]) {
        setPageData(data.newsPage[0]);
      }
    };

    fetchData();
  }, []);

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      // 確保所有新聞都有 slug
      const processedData = {
        ...pageData,
        featuredNews: {
          ...pageData.featuredNews,
          slug: pageData.featuredNews.slug || generateSlug(pageData.featuredNews.title),
        },
        newsList: pageData.newsList.map((news, index) => ({
          ...news,
          slug: news.slug || generateSlug(news.title) || `news-${index}-${Date.now()}`,
        })),
      };

      // 更新本地狀態以顯示生成的 slug
      setPageData(processedData);

      const response = await graphqlRequest(
        UPDATE_PAGE.loc?.source.body || "",
        { input: processedData },
        session
      );
      if (response.errors) {
        alert("更新失敗：" + JSON.stringify(response.errors));
      } else {
        alert("更新成功");
      }
    } catch (err) {
      alert("更新失敗：" + err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-700">資料處理中，請稍候...</p>
          </div>
        </div>
      )}

      <div className="text-3xl font-bold mb-6">最新消息頁面編輯</div>

      {/* Hero Section */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">Hero 區塊設定</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">標題</label>
            <input
              type="text"
              value={pageData.hero.title}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  hero: { ...prev.hero, title: e.target.value },
                }))
              }
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">描述</label>
            <textarea
              value={pageData.hero.description}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  hero: { ...prev.hero, description: e.target.value },
                }))
              }
              rows={3}
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-purple-50 p-6 rounded-lg mb-6 border-2 border-purple-200">
        <h2 className="text-2xl font-bold mb-4 text-purple-900">新聞分類設定</h2>
        <div>
          <label className="block text-sm font-medium mb-1">分類 (逗號分隔)</label>
          <input
            type="text"
            value={pageData.categories.join(", ")}
            onChange={(e) =>
              setPageData((prev) => ({
                ...prev,
                categories: e.target.value.split(",").map((s) => s.trim()),
              }))
            }
            className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
            placeholder="全部, 政策公告, 產業新聞, 成功案例"
          />
        </div>
      </div>

      {/* Featured News */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg mb-6 border-2 border-yellow-200">
        <h2 className="text-2xl font-bold mb-4 text-orange-900">精選新聞設定</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">標題</label>
              <input
                type="text"
                value={pageData.featuredNews.title}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    featuredNews: { ...prev.featuredNews, title: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">網址代稱 (Slug)</label>
              <input
                type="text"
                value={pageData.featuredNews.slug}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    featuredNews: { ...prev.featuredNews, slug: e.target.value },
                  }))
                }
                placeholder="例如: 2024-new-regulations"
                className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">摘要</label>
              <span className={`text-xs ${pageData.featuredNews.excerpt.length > 80 ? 'text-orange-500' : 'text-gray-500'}`}>
                {pageData.featuredNews.excerpt.length} / 80 字
              </span>
            </div>
            <textarea
              value={pageData.featuredNews.excerpt}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  featuredNews: { ...prev.featuredNews, excerpt: e.target.value },
                }))
              }
              rows={3}
              className={`block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border ${pageData.featuredNews.excerpt.length > 80 ? 'border-orange-400' : 'border-gray-300'}`}
              placeholder="建議 80 字以內，前台最多顯示 3 行"
            />
            <p className="text-xs text-gray-400 mt-1">前台最多顯示 3 行，超出部分會以「...」截斷</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">內文</label>
            <CustomEditor
              initialData={pageData.featuredNews.content || ""}
              onContentChange={(content) =>
                setPageData((prev) => ({
                  ...prev,
                  featuredNews: { ...prev.featuredNews, content },
                }))
              }
              height="300px"
              placeholder="在此輸入新聞內文..."
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">日期</label>
              <input
                type="date"
                value={pageData.featuredNews.date}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    featuredNews: { ...prev.featuredNews, date: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">分類</label>
              <select
                value={pageData.featuredNews.category}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    featuredNews: { ...prev.featuredNews, category: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
              >
                <option value="">請選擇分類</option>
                {pageData.categories.filter(cat => cat !== "全部").map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">連結</label>
              <input
                type="text"
                value={pageData.featuredNews.link}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    featuredNews: { ...prev.featuredNews, link: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">圖片</label>
            {pageData.featuredNews.image && (
              <div className="mb-2">
                <Image
                  src={pageData.featuredNews.image}
                  alt="Featured News"
                  width={400}
                  height={250}
                  className="rounded-lg"
                />
              </div>
            )}
            <ImageUploader
              onImageUpload={(data) =>
                setPageData((prev) => ({
                  ...prev,
                  featuredNews: { ...prev.featuredNews, image: data.imageUrl },
                }))
              }
            />
          </div>
        </div>
      </div>

      {/* News List */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg mb-6 border-2 border-green-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-green-900">新聞列表管理</h2>
          <button
            onClick={() =>
              setPageData((prev) => ({
                ...prev,
                newsList: [
                  ...prev.newsList,
                  { title: "", slug: "", excerpt: "", content: "", image: "", date: "", category: "", link: "" },
                ],
              }))
            }
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            新增新聞
          </button>
        </div>
        <div className="space-y-4">
          {pageData.newsList.map((news, index) => (
            <div key={index} className="bg-white p-6 rounded-lg border-2 border-green-300 shadow">
              <h3 className="font-bold text-lg mb-4 text-green-900">新聞 #{index + 1}</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">標題</label>
                    <input
                      type="text"
                      value={news.title}
                      onChange={(e) => {
                        const newNewsList = [...pageData.newsList];
                        newNewsList[index] = { ...newNewsList[index], title: e.target.value };
                        setPageData((prev) => ({ ...prev, newsList: newNewsList }));
                      }}
                      className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">網址代稱 (Slug)</label>
                    <input
                      type="text"
                      value={news.slug || ""}
                      onChange={(e) => {
                        const newNewsList = [...pageData.newsList];
                        newNewsList[index] = { ...newNewsList[index], slug: e.target.value };
                        setPageData((prev) => ({ ...prev, newsList: newNewsList }));
                      }}
                      placeholder="例如: my-news-article"
                      className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium">摘要</label>
                    <span className={`text-xs ${news.excerpt.length > 80 ? 'text-orange-500' : 'text-gray-500'}`}>
                      {news.excerpt.length} / 80 字
                    </span>
                  </div>
                  <textarea
                    value={news.excerpt}
                    onChange={(e) => {
                      const newNewsList = [...pageData.newsList];
                      newNewsList[index] = { ...newNewsList[index], excerpt: e.target.value };
                      setPageData((prev) => ({ ...prev, newsList: newNewsList }));
                    }}
                    rows={2}
                    className={`block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border ${news.excerpt.length > 80 ? 'border-orange-400' : 'border-gray-300'}`}
                    placeholder="建議 80 字以內，前台最多顯示 3 行"
                  />
                  <p className="text-xs text-gray-400 mt-1">前台最多顯示 3 行，超出部分會以「...」截斷</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">內文</label>
                  <CustomEditor
                    initialData={news.content || ""}
                    onContentChange={(content) => {
                      const newNewsList = [...pageData.newsList];
                      newNewsList[index] = { ...newNewsList[index], content };
                      setPageData((prev) => ({ ...prev, newsList: newNewsList }));
                    }}
                    height="250px"
                    placeholder="在此輸入新聞內文..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">日期</label>
                    <input
                      type="date"
                      value={news.date}
                      onChange={(e) => {
                        const newNewsList = [...pageData.newsList];
                        newNewsList[index] = { ...newNewsList[index], date: e.target.value };
                        setPageData((prev) => ({ ...prev, newsList: newNewsList }));
                      }}
                      className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">分類</label>
                    <select
                      value={news.category}
                      onChange={(e) => {
                        const newNewsList = [...pageData.newsList];
                        newNewsList[index] = { ...newNewsList[index], category: e.target.value };
                        setPageData((prev) => ({ ...prev, newsList: newNewsList }));
                      }}
                      className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    >
                      <option value="">請選擇分類</option>
                      {pageData.categories.filter(cat => cat !== "全部").map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">連結</label>
                    <input
                      type="text"
                      value={news.link}
                      onChange={(e) => {
                        const newNewsList = [...pageData.newsList];
                        newNewsList[index] = { ...newNewsList[index], link: e.target.value };
                        setPageData((prev) => ({ ...prev, newsList: newNewsList }));
                      }}
                      className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">圖片</label>
                  {news.image && (
                    <div className="mb-2">
                      <Image
                        src={news.image}
                        alt={news.title}
                        width={200}
                        height={125}
                        className="rounded-lg"
                      />
                    </div>
                  )}
                  <ImageUploader
                    onImageUpload={(data) => {
                      const newNewsList = [...pageData.newsList];
                      newNewsList[index] = { ...newNewsList[index], image: data.imageUrl };
                      setPageData((prev) => ({ ...prev, newsList: newNewsList }));
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const newNewsList = pageData.newsList.filter((_, i) => i !== index);
                  setPageData((prev) => ({ ...prev, newsList: newNewsList }));
                }}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-4"
              >
                刪除此新聞
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Update Button */}
      <div className="mt-6 sticky bottom-4">
        <button
          onClick={handleUpdate}
          className="w-full bg-green-500 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:bg-green-600 shadow-xl"
        >
          💾 儲存所有更新
        </button>
      </div>
    </div>
  );
};
