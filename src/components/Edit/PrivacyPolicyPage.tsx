"use client";
import { gql } from "graphql-tag";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { graphqlRequest } from "@/utils/graphqlClient";
import dynamic from "next/dynamic";

const CustomEditor = dynamic(() => import("@/components/CustomEditor"), {
  ssr: false,
  loading: () => <p className="text-gray-500">載入編輯器中...</p>,
});

const UPDATE_PAGE = gql`
  mutation UpdatePrivacyPolicyPage($input: UpdatePrivacyPolicyPageInput!) {
    updatePrivacyPolicyPage(input: $input) {
      hero
      sections
      lastUpdated
      contactInfo
    }
  }
`;

const query = `
  query privacyPolicyPage {
    privacyPolicyPage {
      hero
      sections
      lastUpdated
      contactInfo
    }
  }
`;

interface Section {
  id: string;
  title: string;
  content: string;
}

interface PageData {
  hero: {
    title: string;
    description: string;
  };
  sections: Section[];
  lastUpdated: string;
  contactInfo: {
    title: string;
    description: string;
    email: string;
    phone: string;
    address: string;
  };
}

export const PrivacyPolicyPage = () => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [pageData, setPageData] = useState<PageData>({
    hero: { title: "", description: "" },
    sections: [],
    lastUpdated: "",
    contactInfo: { title: "", description: "", email: "", phone: "", address: "" },
  });

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const { data } = await res.json();

      if (data?.privacyPolicyPage[0]) {
        setPageData(data.privacyPolicyPage[0]);
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

  const addSection = () => {
    setPageData((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: "",
          content: "",
        },
      ],
    }));
  };

  const removeSection = (index: number) => {
    setPageData((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== index),
    }));
  };

  const updateSection = (index: number, field: keyof Section, value: string) => {
    setPageData((prev) => {
      const newSections = [...prev.sections];
      newSections[index] = { ...newSections[index], [field]: value };
      return { ...prev, sections: newSections };
    });
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= pageData.sections.length) return;

    setPageData((prev) => {
      const newSections = [...prev.sections];
      [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
      return { ...prev, sections: newSections };
    });
  };

  // Memoize editors to prevent unnecessary re-renders
  const sectionEditors = useMemo(() => {
    return pageData.sections.map((section, index) => ({
      id: section.id,
      editor: (
        <CustomEditor
          key={section.id}
          initialData={section.content}
          onContentChange={(value: string) => updateSection(index, "content", value)}
        />
      ),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageData.sections.map(s => s.id).join(',')]);

  return (
    <div>
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-700">資料處理中，請稀候...</p>
          </div>
        </div>
      )}

      <div className="text-3xl font-bold mb-6">隱私權與網站使用說明編輯</div>

      {/* Hero Section */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">頁面標題設定</h2>
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

      {/* Last Updated */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">最後更新日期</h2>
        <div>
          <label className="block text-sm font-medium mb-1">日期（格式：YYYY-MM-DD）</label>
          <input
            type="date"
            value={pageData.lastUpdated}
            onChange={(e) =>
              setPageData((prev) => ({ ...prev, lastUpdated: e.target.value }))
            }
            className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
          />
        </div>
      </div>

      {/* Content Sections */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg mb-6 border-2 border-blue-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-blue-900">內容區塊管理</h2>
          <button
            onClick={addSection}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            新增區塊
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          可以自由新增、編輯或調整內容區塊的順序。內容支援 HTML 格式。
        </p>
        <div className="space-y-4">
          {pageData.sections.map((section, index) => {
            const editorData = sectionEditors.find(e => e.id === section.id);
            return (
              <div key={section.id} className="bg-white p-6 rounded-lg border-2 border-blue-300 shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-blue-900">區塊 #{index + 1}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => moveSection(index, "up")}
                      disabled={index === 0}
                      className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveSection(index, "down")}
                      disabled={index === pageData.sections.length - 1}
                      className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ↓
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">區塊標題</label>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSection(index, "title", e.target.value)}
                      className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                      placeholder="例如：一、個人資料的蒐集"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">區塊內容</label>
                    {editorData?.editor}
                  </div>
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    系統 ID: {section.id}
                  </div>
                </div>
                <button
                  onClick={() => removeSection(index)}
                  className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-4"
                >
                  刪除此區塊
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg mb-6 border-2 border-green-200">
        <h2 className="text-2xl font-bold mb-4 text-green-900">聯絡資訊區塊</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">標題</label>
            <input
              type="text"
              value={pageData.contactInfo.title}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  contactInfo: { ...prev.contactInfo, title: e.target.value },
                }))
              }
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">描述</label>
            <textarea
              value={pageData.contactInfo.description}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  contactInfo: { ...prev.contactInfo, description: e.target.value },
                }))
              }
              rows={2}
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">電子郵件</label>
              <input
                type="email"
                value={pageData.contactInfo.email}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, email: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">聯絡電話</label>
              <input
                type="text"
                value={pageData.contactInfo.phone}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, phone: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">地址</label>
            <input
              type="text"
              value={pageData.contactInfo.address}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  contactInfo: { ...prev.contactInfo, address: e.target.value },
                }))
              }
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Update Button */}
      <div className="mt-6 sticky bottom-4">
        <button
          onClick={handleUpdate}
          className="w-full bg-green-500 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:bg-green-600 shadow-xl"
        >
          儲存所有更新
        </button>
      </div>
    </div>
  );
};
