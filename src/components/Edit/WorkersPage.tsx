"use client";
import { gql } from "graphql-tag";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ImageUploader } from "@/components/Admin/ImageUploader";
import { useSession } from "next-auth/react";
import { graphqlRequest } from "@/utils/graphqlClient";

const UPDATE_PAGE = gql`
  mutation UpdateWorkersPage($input: UpdateWorkersPageInput!) {
    updateWorkersPage(input: $input) {
      hero
      filterOptions
      workers
      ctaSection
    }
  }
`;

const query = `
  query workersPage {
    workersPage {
      hero
      filterOptions
      workers
      ctaSection
    }
  }
`;

interface Worker {
  id: string;
  name: string;
  foreignId: string;
  age: number;
  gender: string;
  country: string;
  photo: string;
  experience: string;
  education: string;
  height: number;
  weight: number;
  skills: string[];
  languages: string[];
  availability: string;
  category: string;
  sourceType: string;
  description: string;
}

interface PageData {
  hero: {
    title: string;
    description: string;
    image: string;
  };
  filterOptions: {
    categories: string[];
    countries: string[];
    genders: string[];
    sourceTypes: string[];
  };
  workers: Worker[];
  ctaSection: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
}

export const WorkersPage = () => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [pageData, setPageData] = useState<PageData>({
    hero: { title: "", description: "", image: "" },
    filterOptions: { categories: [], countries: [], genders: [], sourceTypes: [] },
    workers: [],
    ctaSection: { title: "", description: "", buttonText: "", buttonLink: "" },
  });

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const { data } = await res.json();

      if (data?.workersPage[0]) {
        setPageData(data.workersPage[0]);
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

      <div className="text-3xl font-bold mb-6">移工列表頁面編輯</div>

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

      {/* Filter Options */}
      <div className="bg-purple-50 p-6 rounded-lg mb-6 border-2 border-purple-200">
        <h2 className="text-2xl font-bold mb-4 text-purple-900">篩選選項設定</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">職業類別 (逗號分隔)</label>
            <input
              type="text"
              value={pageData.filterOptions.categories.join(", ")}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  filterOptions: {
                    ...prev.filterOptions,
                    categories: e.target.value.split(",").map((s) => s.trim()),
                  },
                }))
              }
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              placeholder="製造業, 營建業, 服務業"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">國家 (逗號分隔)</label>
            <input
              type="text"
              value={pageData.filterOptions.countries.join(", ")}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  filterOptions: {
                    ...prev.filterOptions,
                    countries: e.target.value.split(",").map((s) => s.trim()),
                  },
                }))
              }
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              placeholder="菲律賓, 越南, 印尼"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">性別 (逗號分隔)</label>
            <input
              type="text"
              value={pageData.filterOptions.genders.join(", ")}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  filterOptions: {
                    ...prev.filterOptions,
                    genders: e.target.value.split(",").map((s) => s.trim()),
                  },
                }))
              }
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              placeholder="男, 女, 不限"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">來源類型 (逗號分隔)</label>
            <input
              type="text"
              value={(pageData.filterOptions.sourceTypes || []).join(", ")}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  filterOptions: {
                    ...prev.filterOptions,
                    sourceTypes: e.target.value.split(",").map((s) => s.trim()),
                  },
                }))
              }
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              placeholder="國內轉出工, 國外引進工"
            />
          </div>
        </div>
      </div>

      {/* Workers List */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg mb-6 border-2 border-green-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-green-900">移工資料管理</h2>
          <button
            onClick={() =>
              setPageData((prev) => ({
                ...prev,
                workers: [
                  ...prev.workers,
                  {
                    id: `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: "",
                    foreignId: "",
                    age: 25,
                    gender: "男",
                    country: "",
                    photo: "",
                    experience: "",
                    education: "",
                    height: 0,
                    weight: 0,
                    skills: [],
                    languages: [],
                    availability: "",
                    category: "",
                    sourceType: "國外引進工",
                    description: "",
                  },
                ],
              }))
            }
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            新增移工
          </button>
        </div>
        <div className="space-y-6">
          {pageData.workers.map((worker, index) => (
            <div key={index} className="bg-white p-6 rounded-lg border-2 border-green-300 shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-green-900">
                  移工 #{index + 1} - {worker.name || "未命名"}
                </h3>
                <div className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded">
                  系統 ID: {worker.id}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">姓名</label>
                  <input
                    type="text"
                    value={worker.name}
                    onChange={(e) => {
                      const newWorkers = [...pageData.workers];
                      newWorkers[index] = { ...newWorkers[index], name: e.target.value };
                      setPageData((prev) => ({ ...prev, workers: newWorkers }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">外國人編號</label>
                  <input
                    type="text"
                    value={worker.foreignId || ""}
                    onChange={(e) => {
                      const newWorkers = [...pageData.workers];
                      newWorkers[index] = { ...newWorkers[index], foreignId: e.target.value };
                      setPageData((prev) => ({ ...prev, workers: newWorkers }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="例: A123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">年齡</label>
                  <input
                    type="number"
                    value={worker.age}
                    onChange={(e) => {
                      const newWorkers = [...pageData.workers];
                      newWorkers[index] = { ...newWorkers[index], age: parseInt(e.target.value) };
                      setPageData((prev) => ({ ...prev, workers: newWorkers }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">學歷</label>
                  <input
                    type="text"
                    value={worker.education || ""}
                    onChange={(e) => {
                      const newWorkers = [...pageData.workers];
                      newWorkers[index] = { ...newWorkers[index], education: e.target.value };
                      setPageData((prev) => ({ ...prev, workers: newWorkers }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="例: 高中、大學"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">身高 (cm)</label>
                  <input
                    type="number"
                    value={worker.height || ""}
                    onChange={(e) => {
                      const newWorkers = [...pageData.workers];
                      newWorkers[index] = { ...newWorkers[index], height: parseInt(e.target.value) || 0 };
                      setPageData((prev) => ({ ...prev, workers: newWorkers }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="例: 170"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">體重 (kg)</label>
                  <input
                    type="number"
                    value={worker.weight || ""}
                    onChange={(e) => {
                      const newWorkers = [...pageData.workers];
                      newWorkers[index] = { ...newWorkers[index], weight: parseInt(e.target.value) || 0 };
                      setPageData((prev) => ({ ...prev, workers: newWorkers }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="例: 65"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">性別</label>
                  <input
                    type="text"
                    value={worker.gender}
                    onChange={(e) => {
                      const newWorkers = [...pageData.workers];
                      newWorkers[index] = { ...newWorkers[index], gender: e.target.value };
                      setPageData((prev) => ({ ...prev, workers: newWorkers }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">國家</label>
                  <input
                    type="text"
                    value={worker.country}
                    onChange={(e) => {
                      const newWorkers = [...pageData.workers];
                      newWorkers[index] = { ...newWorkers[index], country: e.target.value };
                      setPageData((prev) => ({ ...prev, workers: newWorkers }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">職業類別</label>
                  <input
                    type="text"
                    value={worker.category}
                    onChange={(e) => {
                      const newWorkers = [...pageData.workers];
                      newWorkers[index] = { ...newWorkers[index], category: e.target.value };
                      setPageData((prev) => ({ ...prev, workers: newWorkers }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">工作經驗</label>
                  <input
                    type="text"
                    value={worker.experience}
                    onChange={(e) => {
                      const newWorkers = [...pageData.workers];
                      newWorkers[index] = { ...newWorkers[index], experience: e.target.value };
                      setPageData((prev) => ({ ...prev, workers: newWorkers }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="例: 5年工廠經驗"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">可上工時間</label>
                  <input
                    type="text"
                    value={worker.availability}
                    onChange={(e) => {
                      const newWorkers = [...pageData.workers];
                      newWorkers[index] = { ...newWorkers[index], availability: e.target.value };
                      setPageData((prev) => ({ ...prev, workers: newWorkers }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="例: 即時可上工"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">來源類型</label>
                  <select
                    value={worker.sourceType || "國外引進工"}
                    onChange={(e) => {
                      const newWorkers = [...pageData.workers];
                      newWorkers[index] = { ...newWorkers[index], sourceType: e.target.value };
                      setPageData((prev) => ({ ...prev, workers: newWorkers }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  >
                    <option value="國內轉出工">國內轉出工</option>
                    <option value="國外引進工">國外引進工</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">個人描述</label>
                <textarea
                  value={worker.description}
                  onChange={(e) => {
                    const newWorkers = [...pageData.workers];
                    newWorkers[index] = { ...newWorkers[index], description: e.target.value };
                    setPageData((prev) => ({ ...prev, workers: newWorkers }));
                  }}
                  rows={2}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">技能 (逗號分隔)</label>
                <input
                  type="text"
                  value={worker.skills.join(", ")}
                  onChange={(e) => {
                    const newWorkers = [...pageData.workers];
                    newWorkers[index] = {
                      ...newWorkers[index],
                      skills: e.target.value.split(",").map((s) => s.trim()),
                    };
                    setPageData((prev) => ({ ...prev, workers: newWorkers }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="品質檢驗, 機械操作, 團隊合作"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">語言能力 (逗號分隔)</label>
                <input
                  type="text"
                  value={worker.languages.join(", ")}
                  onChange={(e) => {
                    const newWorkers = [...pageData.workers];
                    newWorkers[index] = {
                      ...newWorkers[index],
                      languages: e.target.value.split(",").map((s) => s.trim()),
                    };
                    setPageData((prev) => ({ ...prev, workers: newWorkers }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="中文, 英文, 他加祿語"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">照片</label>
                {worker.photo && (
                  <div className="mb-2">
                    <Image
                      src={worker.photo}
                      alt={worker.name}
                      width={150}
                      height={150}
                      className="rounded-lg"
                    />
                  </div>
                )}
                <ImageUploader
                  onImageUpload={(data) => {
                    const newWorkers = [...pageData.workers];
                    newWorkers[index] = { ...newWorkers[index], photo: data.imageUrl };
                    setPageData((prev) => ({ ...prev, workers: newWorkers }));
                  }}
                />
              </div>

              <button
                onClick={() => {
                  const newWorkers = pageData.workers.filter((_, i) => i !== index);
                  setPageData((prev) => ({ ...prev, workers: newWorkers }));
                }}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-4"
              >
                刪除此移工資料
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">CTA 區塊設定</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">標題</label>
            <input
              type="text"
              value={pageData.ctaSection.title}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  ctaSection: { ...prev.ctaSection, title: e.target.value },
                }))
              }
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">描述</label>
            <textarea
              value={pageData.ctaSection.description}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  ctaSection: { ...prev.ctaSection, description: e.target.value },
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
                value={pageData.ctaSection.buttonText}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    ctaSection: { ...prev.ctaSection, buttonText: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">按鈕連結</label>
              <input
                type="text"
                value={pageData.ctaSection.buttonLink}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    ctaSection: { ...prev.ctaSection, buttonLink: e.target.value },
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
