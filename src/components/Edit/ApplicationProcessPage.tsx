"use client";
import { gql } from "graphql-tag";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ImageUploader } from "@/components/Admin/ImageUploader";
import { useSession } from "next-auth/react";
import { graphqlRequest } from "@/utils/graphqlClient";

const UPDATE_PAGE = gql`
  mutation UpdateApplicationProcessPage($input: UpdateApplicationProcessPageInput!) {
    updateApplicationProcessPage(input: $input) {
      hero
      categories
      contactCTA
    }
  }
`;

const query = `
  query applicationProcessPage {
    applicationProcessPage {
      hero
      categories
      contactCTA
    }
  }
`;

interface Step {
  number: number;
  title: string;
  description: string;
  icon: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  steps: Step[];
}

interface PageData {
  hero: {
    title: string;
    description: string;
    image: string;
  };
  categories: Category[];
  contactCTA: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
}

export const ApplicationProcessPage = () => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [pageData, setPageData] = useState<PageData>({
    hero: { title: "", description: "", image: "" },
    categories: [],
    contactCTA: { title: "", description: "", buttonText: "", buttonLink: "" },
  });

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const { data } = await res.json();

      if (data?.applicationProcessPage[0]) {
        setPageData(data.applicationProcessPage[0]);
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

  const updateCategory = (categoryId: string, updates: Partial<Category>) => {
    setPageData((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) =>
        cat.id === categoryId ? { ...cat, ...updates } : cat
      ),
    }));
  };

  const updateCategoryStep = (
    categoryId: string,
    stepIndex: number,
    updates: Partial<Step>
  ) => {
    setPageData((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) => {
        if (cat.id === categoryId) {
          const newSteps = [...cat.steps];
          newSteps[stepIndex] = { ...newSteps[stepIndex], ...updates };
          return { ...cat, steps: newSteps };
        }
        return cat;
      }),
    }));
  };

  const addStepToCategory = (categoryId: string) => {
    setPageData((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            steps: [
              ...cat.steps,
              {
                number: cat.steps.length + 1,
                title: "",
                description: "",
                icon: "check_circle",
              },
            ],
          };
        }
        return cat;
      }),
    }));
  };

  const deleteStepFromCategory = (categoryId: string, stepIndex: number) => {
    setPageData((prev) => ({
      ...prev,
      categories: prev.categories.map((cat) => {
        if (cat.id === categoryId) {
          return {
            ...cat,
            steps: cat.steps.filter((_, idx) => idx !== stepIndex),
          };
        }
        return cat;
      }),
    }));
  };

  const addNewCategory = () => {
    const newId = `category-${Date.now()}`;
    setPageData((prev) => ({
      ...prev,
      categories: [
        ...prev.categories,
        {
          id: newId,
          name: "新類別",
          description: "",
          icon: "work",
          color: "from-gray-500 to-gray-600",
          steps: [],
        },
      ],
    }));
    setExpandedCategory(newId);
  };

  const deleteCategory = (categoryId: string) => {
    if (confirm("確定要刪除這個類別嗎？")) {
      setPageData((prev) => ({
        ...prev,
        categories: prev.categories.filter((cat) => cat.id !== categoryId),
      }));
    }
  };

  return (
    <div className="pb-20">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-700">資料處理中，請稍候...</p>
          </div>
        </div>
      )}

      <div className="text-3xl font-bold mb-6">申請流程頁面編輯</div>

      {/* Hero 設定 */}
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
          <div>
            <label className="block text-sm font-medium mb-1">Hero 圖片</label>
            {pageData.hero.image && (
              <div className="mb-3">
                <Image
                  src={pageData.hero.image}
                  alt="Hero"
                  width={400}
                  height={200}
                  className="rounded-lg"
                />
              </div>
            )}
            <ImageUploader
              onImageUpload={(data) =>
                setPageData((prev) => ({
                  ...prev,
                  hero: { ...prev.hero, image: data.imageUrl },
                }))
              }
            />
          </div>
        </div>
      </div>

      {/* 工作類別管理 */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg mb-6 border-2 border-indigo-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-indigo-900">工作類別管理</h2>
          <button
            onClick={addNewCategory}
            className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            新增類別
          </button>
        </div>

        <div className="space-y-4">
          {pageData.categories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-lg border-2 border-indigo-200 overflow-hidden"
            >
              {/* 類別標題列 */}
              <div
                className={`p-4 cursor-pointer flex justify-between items-center bg-gradient-to-r ${category.color} bg-opacity-10`}
                onClick={() =>
                  setExpandedCategory(
                    expandedCategory === category.id ? null : category.id
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl">
                    {category.icon}
                  </span>
                  <div>
                    <h3 className="font-bold text-lg text-text-on-brand">{category.name}</h3>
                    <p className="text-sm text-text-on-brand">
                      ID: {category.id} | {category.steps.length} 個步驟
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-2xl">
                  {expandedCategory === category.id
                    ? "expand_less"
                    : "expand_more"}
                </span>
              </div>

              {/* 展開的編輯區域 */}
              {expandedCategory === category.id && (
                <div className="p-6 space-y-6">
                  {/* 類別基本資訊 */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 text-gray-800">
                      類別基本資訊
                    </h4>
                    <div className="space-y-4">
                      <div className="text-xs text-gray-500 bg-white p-2 rounded border border-gray-200">
                        系統 ID: {category.id}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          類別名稱
                        </label>
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) =>
                            updateCategory(category.id, {
                              name: e.target.value,
                            })
                          }
                          className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          顏色漸層 (Tailwind)
                        </label>
                        <input
                          type="text"
                          value={category.color}
                          onChange={(e) =>
                            updateCategory(category.id, {
                              color: e.target.value,
                            })
                          }
                          className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                          placeholder="from-blue-500 to-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          類別描述
                        </label>
                        <textarea
                          value={category.description}
                          onChange={(e) =>
                            updateCategory(category.id, {
                              description: e.target.value,
                            })
                          }
                          rows={2}
                          className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 步驟管理 */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-gray-800">
                        申請步驟
                      </h4>
                      <button
                        onClick={() => addStepToCategory(category.id)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">
                          add
                        </span>
                        新增步驟
                      </button>
                    </div>

                    <div className="space-y-3">
                      {category.steps.map((step, stepIdx) => (
                        <div
                          key={stepIdx}
                          className="bg-white p-4 rounded-lg border border-gray-200"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-semibold text-sm text-gray-700">
                              步驟 #{step.number}
                            </h5>
                            <button
                              onClick={() =>
                                deleteStepFromCategory(category.id, stepIdx)
                              }
                              className="text-red-500 hover:text-red-700"
                            >
                              <span className="material-symbols-outlined text-lg">
                                delete
                              </span>
                            </button>
                          </div>

                          <div className="mb-3">
                            <label className="block text-xs font-medium mb-1">
                              步驟編號
                            </label>
                            <input
                              type="number"
                              value={step.number}
                              onChange={(e) =>
                                updateCategoryStep(category.id, stepIdx, {
                                  number: parseInt(e.target.value),
                                })
                              }
                              className="block w-full rounded-md bg-white px-2 py-1.5 text-sm text-gray-900 border border-gray-300"
                            />
                          </div>

                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs font-medium mb-1">
                                步驟標題
                              </label>
                              <input
                                type="text"
                                value={step.title}
                                onChange={(e) =>
                                  updateCategoryStep(category.id, stepIdx, {
                                    title: e.target.value,
                                  })
                                }
                                className="block w-full rounded-md bg-white px-2 py-1.5 text-sm text-gray-900 border border-gray-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">
                                步驟描述
                              </label>
                              <textarea
                                value={step.description}
                                onChange={(e) =>
                                  updateCategoryStep(category.id, stepIdx, {
                                    description: e.target.value,
                                  })
                                }
                                rows={2}
                                className="block w-full rounded-md bg-white px-2 py-1.5 text-sm text-gray-900 border border-gray-300"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {category.steps.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <span className="material-symbols-outlined text-4xl mb-2 block">
                            info
                          </span>
                          <p>此類別尚未新增步驟</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 刪除類別按鈕 */}
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    刪除此類別
                  </button>
                </div>
              )}
            </div>
          ))}

          {pageData.categories.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <span className="material-symbols-outlined text-6xl mb-4 block">
                category
              </span>
              <p className="text-lg">尚未新增工作類別</p>
              <p className="text-sm">點擊上方「新增類別」按鈕開始建立</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA 設定 */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">行動呼籲區塊設定</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">標題</label>
            <input
              type="text"
              value={pageData.contactCTA.title}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  contactCTA: { ...prev.contactCTA, title: e.target.value },
                }))
              }
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">描述</label>
            <textarea
              value={pageData.contactCTA.description}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  contactCTA: {
                    ...prev.contactCTA,
                    description: e.target.value,
                  },
                }))
              }
              rows={2}
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                按鈕文字
              </label>
              <input
                type="text"
                value={pageData.contactCTA.buttonText}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    contactCTA: {
                      ...prev.contactCTA,
                      buttonText: e.target.value,
                    },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                按鈕連結
              </label>
              <input
                type="text"
                value={pageData.contactCTA.buttonLink}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    contactCTA: {
                      ...prev.contactCTA,
                      buttonLink: e.target.value,
                    },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 更新按鈕 */}
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
