"use client";
import { gql } from "graphql-tag";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ImageUploader } from "@/components/Admin/ImageUploader";
import { useSession } from "next-auth/react";
import { graphqlRequest } from "@/utils/graphqlClient";

const UPDATE_PAGE = gql`
  mutation UpdateStaffPage($input: UpdateStaffPageInput!) {
    updateStaffPage(input: $input) {
      hero
      listSection
      staffList
      ctaSection
    }
  }
`;

const query = `
  query staffPage {
    staffPage {
      hero
      listSection
      staffList
      ctaSection
    }
  }
`;

interface Staff {
  id: string;
  name: string;
  position: string;
  photo: string;
  phone: string;
  email: string;
  line: string;
  bio: string;
  specialties: string[];
  detailUrl?: string;
}

interface PageData {
  hero: {
    title: string;
    description: string;
    image: string;
  };
  listSection: {
    tag: string;
    title: string;
    description: string;
  };
  staffList: Staff[];
  ctaSection: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
}

export const StaffPage = () => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [pageData, setPageData] = useState<PageData>({
    hero: { title: "", description: "", image: "" },
    listSection: { tag: "", title: "", description: "" },
    staffList: [],
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

      if (data?.staffPage[0]) {
        setPageData(data.staffPage[0]);
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

      <div className="text-3xl font-bold mb-6">主力人力頁面編輯</div>

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

      {/* 列表區塊標題設定 */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">列表區塊標題設定</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">標籤</label>
            <input
              type="text"
              value={pageData.listSection.tag}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  listSection: { ...prev.listSection, tag: e.target.value },
                }))
              }
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              placeholder="例如：專業團隊"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">標題</label>
            <input
              type="text"
              value={pageData.listSection.title}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  listSection: { ...prev.listSection, title: e.target.value },
                }))
              }
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              placeholder="例如：認識我們的業務團隊"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">描述</label>
            <textarea
              value={pageData.listSection.description}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  listSection: { ...prev.listSection, description: e.target.value },
                }))
              }
              rows={2}
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              placeholder="例如：每位業務人員都經過專業培訓，致力於為您提供最優質的服務"
            />
          </div>
        </div>
      </div>

      {/* 業務人員列表 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border-2 border-blue-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-blue-900">業務人員管理</h2>
          <button
            onClick={() =>
              setPageData((prev) => ({
                ...prev,
                staffList: [
                  ...prev.staffList,
                  {
                    id: `staff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: "",
                    position: "",
                    photo: "",
                    phone: "",
                    email: "",
                    line: "",
                    bio: "",
                    specialties: [],
                    detailUrl: "",
                  },
                ],
              }))
            }
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            新增業務人員
          </button>
        </div>
        <div className="space-y-6">
          {pageData.staffList.map((staff, index) => (
            <div key={index} className="bg-white p-6 rounded-lg border-2 border-blue-300 shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-blue-900">
                  業務人員 #{index + 1} - {staff.name || "未命名"}
                </h3>
                <div className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded">
                  系統 ID: {staff.id}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">姓名</label>
                  <input
                    type="text"
                    value={staff.name}
                    onChange={(e) => {
                      const newStaffList = [...pageData.staffList];
                      newStaffList[index] = { ...newStaffList[index], name: e.target.value };
                      setPageData((prev) => ({ ...prev, staffList: newStaffList }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">職位</label>
                  <input
                    type="text"
                    value={staff.position}
                    onChange={(e) => {
                      const newStaffList = [...pageData.staffList];
                      newStaffList[index] = { ...newStaffList[index], position: e.target.value };
                      setPageData((prev) => ({ ...prev, staffList: newStaffList }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">電話</label>
                  <input
                    type="text"
                    value={staff.phone}
                    onChange={(e) => {
                      const newStaffList = [...pageData.staffList];
                      newStaffList[index] = { ...newStaffList[index], phone: e.target.value };
                      setPageData((prev) => ({ ...prev, staffList: newStaffList }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="0912-345-678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={staff.email}
                    onChange={(e) => {
                      const newStaffList = [...pageData.staffList];
                      newStaffList[index] = { ...newStaffList[index], email: e.target.value };
                      setPageData((prev) => ({ ...prev, staffList: newStaffList }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="example@youshi-hr.com"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">LINE ID</label>
                  <input
                    type="text"
                    value={staff.line}
                    onChange={(e) => {
                      const newStaffList = [...pageData.staffList];
                      newStaffList[index] = { ...newStaffList[index], line: e.target.value };
                      setPageData((prev) => ({ ...prev, staffList: newStaffList }));
                    }}
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="@youshi_xxx"
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium">個人簡介</label>
                  <span className={`text-xs ${staff.bio.length > 80 ? 'text-orange-500' : 'text-gray-500'}`}>
                    {staff.bio.length} / 80 字
                  </span>
                </div>
                <textarea
                  value={staff.bio}
                  onChange={(e) => {
                    const newStaffList = [...pageData.staffList];
                    newStaffList[index] = { ...newStaffList[index], bio: e.target.value };
                    setPageData((prev) => ({ ...prev, staffList: newStaffList }));
                  }}
                  rows={3}
                  className={`block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border ${staff.bio.length > 80 ? 'border-orange-400' : 'border-gray-300'}`}
                  placeholder="建議 80 字以內，前台最多顯示 4 行"
                />
                <p className="text-xs text-gray-400 mt-1">前台最多顯示 4 行，超出部分會以「...」截斷</p>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">專長領域 (逗號分隔)</label>
                <input
                  type="text"
                  value={staff.specialties.join(", ")}
                  onChange={(e) => {
                    const newStaffList = [...pageData.staffList];
                    newStaffList[index] = {
                      ...newStaffList[index],
                      specialties: e.target.value.split(",").map((s) => s.trim()),
                    };
                    setPageData((prev) => ({ ...prev, staffList: newStaffList }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="製造業, 營建業, 看護"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">照片</label>
                <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 text-lg">💡</span>
                    <div className="text-sm text-amber-700">
                      <p className="font-medium">建議上傳 3:4 直式比例的圖片</p>
                      <p className="text-xs mt-1">推薦尺寸：600×800 px 或 750×1000 px，避免前台顯示出現白邊</p>
                    </div>
                  </div>
                </div>
                {staff.photo && (
                  <div className="mb-2">
                    <Image
                      src={staff.photo}
                      alt={staff.name}
                      width={150}
                      height={200}
                      className="rounded-lg object-cover"
                    />
                  </div>
                )}
                <ImageUploader
                  onImageUpload={(data) => {
                    const newStaffList = [...pageData.staffList];
                    newStaffList[index] = { ...newStaffList[index], photo: data.imageUrl };
                    setPageData((prev) => ({ ...prev, staffList: newStaffList }));
                  }}
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">詳細資料網址 (QR Code)</label>
                <input
                  type="text"
                  value={staff.detailUrl || ""}
                  onChange={(e) => {
                    const newStaffList = [...pageData.staffList];
                    newStaffList[index] = { ...newStaffList[index], detailUrl: e.target.value };
                    setPageData((prev) => ({ ...prev, staffList: newStaffList }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="https://example.com/staff-detail"
                />
                <p className="text-xs text-gray-500 mt-1">用戶點擊「查看詳細資料」時會顯示此網址的 QR Code</p>
              </div>

              <button
                onClick={() => {
                  const newStaffList = pageData.staffList.filter((_, i) => i !== index);
                  setPageData((prev) => ({ ...prev, staffList: newStaffList }));
                }}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-4"
              >
                刪除此業務人員
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
          儲存所有更新
        </button>
      </div>
    </div>
  );
};
