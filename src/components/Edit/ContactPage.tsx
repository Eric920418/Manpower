"use client";
import { gql } from "graphql-tag";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { graphqlRequest } from "@/utils/graphqlClient";

const UPDATE_PAGE = gql`
  mutation UpdateContactPage($input: UpdateContactPageInput!) {
    updateContactPage(input: $input) {
      badge
      title
      description
      formFields
      submitButton
      contactInfo
    }
  }
`;

const query = `
  query contactPage {
    contactPage {
      badge
      title
      description
      formFields
      submitButton
      contactInfo
    }
  }
`;

interface FormField {
  label: string;
  placeholder: string;
  icon: string;
  required: boolean;
  rows?: number;
}

interface ContactInfo {
  icon: string;
  title: string;
  content: string;
  description: string;
  link: string;
}

interface ContactPageData {
  badge: string;
  title: string;
  description: string;
  formFields: {
    name: FormField;
    email: FormField;
    phone: FormField;
    message: FormField;
  };
  submitButton: {
    text: string;
    icon: string;
  };
  contactInfo: ContactInfo[];
}

export const ContactPage = () => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [pageData, setPageData] = useState<ContactPageData>({
    badge: "",
    title: "",
    description: "",
    formFields: {
      name: { label: "", placeholder: "", icon: "person", required: true },
      email: { label: "", placeholder: "", icon: "mail", required: true },
      phone: { label: "", placeholder: "", icon: "phone", required: true },
      message: { label: "", placeholder: "", icon: "chat_bubble", required: true, rows: 5 },
    },
    submitButton: { text: "", icon: "send" },
    contactInfo: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const { data } = await res.json();

      if (data?.contactPage[0]) {
        setPageData({
          badge: data.contactPage[0].badge || "",
          title: data.contactPage[0].title || "",
          description: data.contactPage[0].description || "",
          formFields: data.contactPage[0].formFields || pageData.formFields,
          submitButton: data.contactPage[0].submitButton || pageData.submitButton,
          contactInfo: data.contactPage[0].contactInfo || [],
        });
      }
    };

    fetchData();
  }, []);

  const handleUpdate = async () => {
    setIsLoading(true);
    const input = {
      badge: pageData.badge,
      title: pageData.title,
      description: pageData.description,
      formFields: pageData.formFields,
      submitButton: pageData.submitButton,
      contactInfo: pageData.contactInfo,
    };

    try {
      const response = await graphqlRequest(
        UPDATE_PAGE.loc?.source.body || "",
        { input },
        session
      );
      if (response.errors) {
        console.error("更新失敗:", JSON.stringify(response.errors, null, 2));
        alert("更新失敗：" + JSON.stringify(response.errors));
      } else {
        alert("更新成功");
      }
    } catch (err) {
      console.error("更新失敗:", err);
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

      <div className="text-3xl font-bold mb-6">聯絡我們頁面編輯</div>

      {/* 基本設定 */}
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-6 rounded-lg mb-6 border-2 border-teal-200">
        <h2 className="text-2xl font-bold mb-4 text-teal-900">基本設定</h2>

        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">徽章文字</label>
                <input
                  type="text"
                  value={pageData.badge}
                  onChange={(e) =>
                    setPageData((prev) => ({ ...prev, badge: e.target.value }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">標題</label>
                <input
                  type="text"
                  value={pageData.title}
                  onChange={(e) =>
                    setPageData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea
                  rows={3}
                  value={pageData.description}
                  onChange={(e) =>
                    setPageData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 表單欄位設定 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border-2 border-blue-200">
        <h2 className="text-2xl font-bold mb-4 text-blue-900">表單欄位設定</h2>

        {/* 姓名欄位 */}
        <div className="mb-4 p-3 bg-white rounded">
          <h4 className="font-semibold mb-2">姓名欄位</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">標籤</label>
              <input
                type="text"
                value={pageData.formFields.name.label}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    formFields: {
                      ...prev.formFields,
                      name: { ...prev.formFields.name, label: e.target.value },
                    },
                  }))
                }
                className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">提示文字</label>
              <input
                type="text"
                value={pageData.formFields.name.placeholder}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    formFields: {
                      ...prev.formFields,
                      name: { ...prev.formFields.name, placeholder: e.target.value },
                    },
                  }))
                }
                className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Email 欄位 */}
        <div className="mb-4 p-3 bg-white rounded">
          <h4 className="font-semibold mb-2">Email 欄位</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">標籤</label>
              <input
                type="text"
                value={pageData.formFields.email.label}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    formFields: {
                      ...prev.formFields,
                      email: { ...prev.formFields.email, label: e.target.value },
                    },
                  }))
                }
                className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">提示文字</label>
              <input
                type="text"
                value={pageData.formFields.email.placeholder}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    formFields: {
                      ...prev.formFields,
                      email: { ...prev.formFields.email, placeholder: e.target.value },
                    },
                  }))
                }
                className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* 電話欄位 */}
        <div className="mb-4 p-3 bg-white rounded">
          <h4 className="font-semibold mb-2">電話欄位</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">標籤</label>
              <input
                type="text"
                value={pageData.formFields.phone.label}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    formFields: {
                      ...prev.formFields,
                      phone: { ...prev.formFields.phone, label: e.target.value },
                    },
                  }))
                }
                className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">提示文字</label>
              <input
                type="text"
                value={pageData.formFields.phone.placeholder}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    formFields: {
                      ...prev.formFields,
                      phone: { ...prev.formFields.phone, placeholder: e.target.value },
                    },
                  }))
                }
                className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* 訊息欄位 */}
        <div className="mb-4 p-3 bg-white rounded">
          <h4 className="font-semibold mb-2">訊息欄位</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">標籤</label>
              <input
                type="text"
                value={pageData.formFields.message.label}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    formFields: {
                      ...prev.formFields,
                      message: { ...prev.formFields.message, label: e.target.value },
                    },
                  }))
                }
                className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">提示文字</label>
              <input
                type="text"
                value={pageData.formFields.message.placeholder}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    formFields: {
                      ...prev.formFields,
                      message: { ...prev.formFields.message, placeholder: e.target.value },
                    },
                  }))
                }
                className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* 送出按鈕 */}
        <div className="p-3 bg-white rounded">
          <h4 className="font-semibold mb-2">送出按鈕</h4>
          <div>
            <label className="block text-sm font-medium mb-1">按鈕文字</label>
            <input
              type="text"
              value={pageData.submitButton.text}
              onChange={(e) =>
                setPageData((prev) => ({
                  ...prev,
                  submitButton: { ...prev.submitButton, text: e.target.value },
                }))
              }
              className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
            />
          </div>
        </div>
      </div>

      {/* 聯絡資訊卡片 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-6 border-2 border-purple-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-purple-900">聯絡資訊卡片</h2>
          <button
            onClick={() => {
              const newContactInfo = [
                ...pageData.contactInfo,
                { icon: "mail", title: "", content: "", description: "", link: "#" },
              ];
              setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            + 新增卡片
          </button>
        </div>

        {pageData.contactInfo.map((info, index) => (
          <div key={index} className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold">卡片 #{index + 1}</h4>
              <button
                onClick={() => {
                  const newContactInfo = pageData.contactInfo.filter((_, i) => i !== index);
                  setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                }}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                刪除
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">圖標</label>
                <input
                  type="text"
                  value={info.icon}
                  onChange={(e) => {
                    const newContactInfo = [...pageData.contactInfo];
                    newContactInfo[index] = { ...newContactInfo[index], icon: e.target.value };
                    setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="mail, phone, location_on"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">標題</label>
                <input
                  type="text"
                  value={info.title}
                  onChange={(e) => {
                    const newContactInfo = [...pageData.contactInfo];
                    newContactInfo[index] = { ...newContactInfo[index], title: e.target.value };
                    setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">內容</label>
                <input
                  type="text"
                  value={info.content}
                  onChange={(e) => {
                    const newContactInfo = [...pageData.contactInfo];
                    newContactInfo[index] = { ...newContactInfo[index], content: e.target.value };
                    setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">連結</label>
                <input
                  type="text"
                  value={info.link}
                  onChange={(e) => {
                    const newContactInfo = [...pageData.contactInfo];
                    newContactInfo[index] = { ...newContactInfo[index], link: e.target.value };
                    setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="mailto:, tel:, #"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">描述</label>
                <input
                  type="text"
                  value={info.description}
                  onChange={(e) => {
                    const newContactInfo = [...pageData.contactInfo];
                    newContactInfo[index] = { ...newContactInfo[index], description: e.target.value };
                    setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 更新按鈕 */}
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
