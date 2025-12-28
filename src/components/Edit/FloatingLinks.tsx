"use client";
import { gql } from "graphql-tag";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ImageUploader } from "@/components/Admin/ImageUploader";
import { useSession } from "next-auth/react";
import { graphqlRequest } from "@/utils/graphqlClient";

const UPDATE_PAGE = gql`
  mutation UpdateFloatingLinks($input: UpdateFloatingLinksInput!) {
    updateFloatingLinks(input: $input) {
      enabled
      position
      links
    }
  }
`;

const query = `
  query floatingLinks {
    floatingLinks {
      enabled
      position
      links
    }
  }
`;

interface FloatingLink {
  id: string;
  icon: string;
  label: string;
  url: string;
  isActive: boolean;
  order: number;
}

interface PageData {
  enabled: boolean;
  position: string;
  links: FloatingLink[];
}

export const FloatingLinks = () => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [pageData, setPageData] = useState<PageData>({
    enabled: true,
    position: "right",
    links: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const { data } = await res.json();

      if (data?.floatingLinks[0]) {
        setPageData(data.floatingLinks[0]);
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

  const addNewLink = () => {
    const newLink: FloatingLink = {
      id: `fl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      icon: "",
      label: "",
      url: "",
      isActive: true,
      order: pageData.links.length + 1,
    };
    setPageData((prev) => ({
      ...prev,
      links: [...prev.links, newLink],
    }));
  };

  const updateLink = (index: number, field: keyof FloatingLink, value: string | boolean | number) => {
    const newLinks = [...pageData.links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setPageData((prev) => ({ ...prev, links: newLinks }));
  };

  const deleteLink = (index: number) => {
    const newLinks = pageData.links.filter((_, i) => i !== index);
    setPageData((prev) => ({ ...prev, links: newLinks }));
  };

  const moveLink = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === pageData.links.length - 1)
    ) {
      return;
    }
    const newLinks = [...pageData.links];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newLinks[index], newLinks[swapIndex]] = [newLinks[swapIndex], newLinks[index]];
    // 更新 order 值
    newLinks.forEach((link, i) => {
      link.order = i + 1;
    });
    setPageData((prev) => ({ ...prev, links: newLinks }));
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

      <div className="text-3xl font-bold mb-6">懸浮連結設定</div>

      {/* 基本設定 */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">基本設定</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pageData.enabled}
                onChange={(e) =>
                  setPageData((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium">啟用懸浮連結</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">顯示位置</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="position"
                  value="left"
                  checked={pageData.position === "left"}
                  onChange={(e) =>
                    setPageData((prev) => ({ ...prev, position: e.target.value }))
                  }
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>左側</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="position"
                  value="right"
                  checked={pageData.position === "right"}
                  onChange={(e) =>
                    setPageData((prev) => ({ ...prev, position: e.target.value }))
                  }
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span>右側</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* 連結列表 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-6 border-2 border-purple-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-purple-900">懸浮連結管理</h2>
          <button
            onClick={addNewLink}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            新增連結
          </button>
        </div>

        <div className="space-y-4">
          {pageData.links.map((link, index) => (
            <div
              key={link.id}
              className="bg-white p-5 rounded-lg border-2 border-purple-300 shadow-md"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg text-purple-900">
                    #{index + 1} - {link.label || "未命名連結"}
                  </h3>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={link.isActive}
                      onChange={(e) => updateLink(index, "isActive", e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className={link.isActive ? "text-green-600" : "text-gray-400"}>
                      {link.isActive ? "啟用中" : "已停用"}
                    </span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => moveLink(index, "up")}
                    disabled={index === 0}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上移
                  </button>
                  <button
                    onClick={() => moveLink(index, "down")}
                    disabled={index === pageData.links.length - 1}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下移
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">標籤名稱</label>
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => updateLink(index, "label", e.target.value)}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="例如：Line、Facebook"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">連結網址</label>
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateLink(index, "url", e.target.value)}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="https:// 或 tel:+886..."
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">圖示</label>
                <div className="flex items-start gap-4">
                  {link.icon && (
                    <div className="flex-shrink-0">
                      <Image
                        src={link.icon}
                        alt={link.label}
                        width={60}
                        height={60}
                        className="rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <ImageUploader
                      onImageUpload={(data) => updateLink(index, "icon", data.imageUrl)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      建議上傳 60x60 像素的 PNG 圖片（支援透明背景）
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => deleteLink(index)}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-4"
              >
                刪除此連結
              </button>
            </div>
          ))}

          {pageData.links.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              尚未新增任何懸浮連結，點擊上方「新增連結」按鈕開始設定
            </div>
          )}
        </div>
      </div>

      {/* 預覽區塊 */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">預覽效果</h2>
        <div className="relative bg-gray-300 rounded-lg h-64 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            網頁內容區域
          </div>
          {pageData.enabled && (
            <div
              className={`absolute bottom-4 ${
                pageData.position === "left" ? "left-4" : "right-4"
              } flex flex-col gap-2`}
            >
              {pageData.links
                .filter((link) => link.isActive)
                .map((link) => (
                  <div
                    key={link.id}
                    className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200"
                    title={link.label}
                  >
                    {link.icon ? (
                      <Image
                        src={link.icon}
                        alt={link.label}
                        width={32}
                        height={32}
                        className="rounded"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">圖</span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-2">
          這是懸浮連結在網頁上的預覽效果。實際顯示會固定在螢幕{pageData.position === "left" ? "左" : "右"}下角，隨頁面滾動而保持位置。
        </p>
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
