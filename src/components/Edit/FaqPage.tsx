"use client";
import { gql } from "graphql-tag";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { graphqlRequest } from "@/utils/graphqlClient";

const UPDATE_PAGE = gql`
  mutation UpdateFaqPage($input: UpdateFaqPageInput!) {
    updateFaqPage(input: $input) {
      hero
      categories
      faqs
      contactSection
    }
  }
`;

const query = `
  query faqPage {
    faqPage {
      hero
      categories
      faqs
      contactSection
    }
  }
`;

interface Category {
  id: string;
  name: string;
}

interface FAQ {
  category: string;
  question: string;
  answer: string;
}

interface PageData {
  hero: {
    title: string;
    description: string;
  };
  categories: Category[];
  faqs: FAQ[];
  contactSection: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
}

export const FaqPage = () => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [pageData, setPageData] = useState<PageData>({
    hero: { title: "", description: "" },
    categories: [],
    faqs: [],
    contactSection: { title: "", description: "", buttonText: "", buttonLink: "" },
  });

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const { data } = await res.json();

      if (data?.faqPage[0]) {
        setPageData(data.faqPage[0]);
      }
    };

    fetchData();
  }, []);

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const response = await graphqlRequest(
        UPDATE_PAGE.loc?.source.body || "",
        { input: pageData },
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

      <div className="text-3xl font-bold mb-6">常見問題頁面編輯</div>

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
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-6 border-2 border-purple-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-purple-900">問題分類設定</h2>
          <button
            onClick={() =>
              setPageData((prev) => ({
                ...prev,
                categories: [
                  ...prev.categories,
                  {
                    id: `category-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: ""
                  },
                ],
              }))
            }
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            新增分類
          </button>
        </div>
        <div className="space-y-3">
          {pageData.categories.map((category, index) => (
            <div key={index} className="bg-white p-4 rounded-lg border border-purple-200">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">分類名稱</label>
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => {
                      const newCategories = [...pageData.categories];
                      newCategories[index] = { ...newCategories[index], name: e.target.value };
                      setPageData((prev) => ({ ...prev, categories: newCategories }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="申請流程"
                  />
                </div>
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  系統 ID: {category.id}
                </div>
              </div>
              <button
                onClick={() => {
                  const newCategories = pageData.categories.filter((_, i) => i !== index);
                  setPageData((prev) => ({ ...prev, categories: newCategories }));
                }}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-3"
              >
                刪除分類
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg mb-6 border-2 border-blue-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-blue-900">常見問題管理</h2>
          <button
            onClick={() =>
              setPageData((prev) => ({
                ...prev,
                faqs: [
                  ...prev.faqs,
                  { category: "", question: "", answer: "" },
                ],
              }))
            }
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            新增問題
          </button>
        </div>
        <div className="space-y-4">
          {pageData.faqs.map((faq, index) => (
            <div key={index} className="bg-white p-6 rounded-lg border-2 border-blue-300 shadow">
              <h3 className="font-bold text-lg mb-4 text-blue-900">問題 #{index + 1}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">分類</label>
                  <select
                    value={faq.category}
                    onChange={(e) => {
                      const newFaqs = [...pageData.faqs];
                      newFaqs[index] = { ...newFaqs[index], category: e.target.value };
                      setPageData((prev) => ({ ...prev, faqs: newFaqs }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  >
                    <option value="">請選擇分類</option>
                    {pageData.categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">問題</label>
                  <input
                    type="text"
                    value={faq.question}
                    onChange={(e) => {
                      const newFaqs = [...pageData.faqs];
                      newFaqs[index] = { ...newFaqs[index], question: e.target.value };
                      setPageData((prev) => ({ ...prev, faqs: newFaqs }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">答案</label>
                  <textarea
                    value={faq.answer}
                    onChange={(e) => {
                      const newFaqs = [...pageData.faqs];
                      newFaqs[index] = { ...newFaqs[index], answer: e.target.value };
                      setPageData((prev) => ({ ...prev, faqs: newFaqs }));
                    }}
                    rows={4}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const newFaqs = pageData.faqs.filter((_, i) => i !== index);
                  setPageData((prev) => ({ ...prev, faqs: newFaqs }));
                }}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-4"
              >
                刪除此問題
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">聯絡區塊設定</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">標題</label>
            <input
              type="text"
              value={pageData.contactSection.title}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  contactSection: { ...prev.contactSection, title: e.target.value },
                }))
              }
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">描述</label>
            <textarea
              value={pageData.contactSection.description}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  contactSection: { ...prev.contactSection, description: e.target.value },
                }))
              }
              rows={2}
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">按鈕文字</label>
              <input
                type="text"
                value={pageData.contactSection.buttonText}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    contactSection: { ...prev.contactSection, buttonText: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">按鈕連結</label>
              <input
                type="text"
                value={pageData.contactSection.buttonLink}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    contactSection: { ...prev.contactSection, buttonLink: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
          </div>
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
