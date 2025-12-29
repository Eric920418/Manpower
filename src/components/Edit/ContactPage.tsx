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
      questionTypes
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
      questionTypes
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

interface QuestionType {
  id: string;
  label: string;
}

interface ContactPageData {
  badge: string;
  title: string;
  description: string;
  questionTypes: QuestionType[];
  formFields: {
    questionType: FormField;
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
    questionTypes: [],
    formFields: {
      questionType: { label: "", placeholder: "", icon: "category", required: true },
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
          questionTypes: data.contactPage[0].questionTypes || [],
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
      questionTypes: pageData.questionTypes,
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

      {/* 問題類型選項設定 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-lg mb-6 border-2 border-amber-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-amber-900">問題類型選項</h2>
          <button
            onClick={() => {
              const newId = `type-${Date.now()}`;
              setPageData((prev) => ({
                ...prev,
                questionTypes: [...prev.questionTypes, { id: newId, label: "新選項" }],
              }));
            }}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            新增選項
          </button>
        </div>

        <div className="space-y-3">
          {pageData.questionTypes.map((type, index) => (
            <div key={type.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
              <span className="material-symbols-outlined text-amber-600">category</span>
              <span className="text-gray-400 text-sm w-8">{index + 1}.</span>
              <input
                type="text"
                value={type.label}
                onChange={(e) => {
                  const newTypes = [...pageData.questionTypes];
                  newTypes[index] = { ...newTypes[index], label: e.target.value };
                  setPageData((prev) => ({ ...prev, questionTypes: newTypes }));
                }}
                placeholder="選項名稱"
                className="flex-1 px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md"
              />
              <button
                onClick={() => {
                  setPageData((prev) => ({
                    ...prev,
                    questionTypes: prev.questionTypes.filter((_, i) => i !== index),
                  }));
                }}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          ))}
          {pageData.questionTypes.length === 0 && (
            <p className="text-gray-500 text-center py-4">尚未設定任何選項，請點擊上方按鈕新增</p>
          )}
        </div>
      </div>

      {/* 表單欄位設定 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border-2 border-blue-200">
        <h2 className="text-2xl font-bold mb-4 text-blue-900">表單欄位設定</h2>

        {/* 問題類型欄位 */}
        <div className="mb-4 p-3 bg-white rounded">
          <h4 className="font-semibold mb-2">問題類型欄位</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">標籤</label>
              <input
                type="text"
                value={pageData.formFields.questionType?.label || ""}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    formFields: {
                      ...prev.formFields,
                      questionType: { ...prev.formFields.questionType, label: e.target.value },
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
                value={pageData.formFields.questionType?.placeholder || ""}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    formFields: {
                      ...prev.formFields,
                      questionType: { ...prev.formFields.questionType, placeholder: e.target.value },
                    },
                  }))
                }
                className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
          </div>
        </div>

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
        <h2 className="text-2xl font-bold text-purple-900 mb-4">聯絡資訊卡片</h2>

        {/* 電子信箱卡片 */}
        {pageData.contactInfo[0] && (
          <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600">mail</span>
              電子信箱
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">標題</label>
                <input
                  type="text"
                  value={pageData.contactInfo[0].title}
                  onChange={(e) => {
                    const newContactInfo = [...pageData.contactInfo];
                    newContactInfo[0] = { ...newContactInfo[0], title: e.target.value };
                    setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email 地址</label>
                <input
                  type="email"
                  value={pageData.contactInfo[0].content}
                  onChange={(e) => {
                    const newContactInfo = [...pageData.contactInfo];
                    newContactInfo[0] = {
                      ...newContactInfo[0],
                      content: e.target.value,
                      link: `mailto:${e.target.value}`
                    };
                    setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="example@email.com"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">描述</label>
                <input
                  type="text"
                  value={pageData.contactInfo[0].description}
                  onChange={(e) => {
                    const newContactInfo = [...pageData.contactInfo];
                    newContactInfo[0] = { ...newContactInfo[0], description: e.target.value };
                    setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* 聯絡電話卡片 */}
        {pageData.contactInfo[1] && (
          <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600">phone</span>
              聯絡電話
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">標題</label>
                <input
                  type="text"
                  value={pageData.contactInfo[1].title}
                  onChange={(e) => {
                    const newContactInfo = [...pageData.contactInfo];
                    newContactInfo[1] = { ...newContactInfo[1], title: e.target.value };
                    setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">電話號碼</label>
                <input
                  type="text"
                  value={pageData.contactInfo[1].content}
                  onChange={(e) => {
                    const newContactInfo = [...pageData.contactInfo];
                    const phoneNumber = e.target.value.replace(/[^0-9+\-]/g, '');
                    newContactInfo[1] = {
                      ...newContactInfo[1],
                      content: e.target.value,
                      link: `tel:${phoneNumber}`
                    };
                    setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="+886-2-1234-5678"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">描述</label>
                <input
                  type="text"
                  value={pageData.contactInfo[1].description}
                  onChange={(e) => {
                    const newContactInfo = [...pageData.contactInfo];
                    newContactInfo[1] = { ...newContactInfo[1], description: e.target.value };
                    setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* 辦公地點卡片 */}
        {pageData.contactInfo[2] && (
          <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600">location_on</span>
              辦公地點
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">標題</label>
                <input
                  type="text"
                  value={pageData.contactInfo[2].title}
                  onChange={(e) => {
                    const newContactInfo = [...pageData.contactInfo];
                    newContactInfo[2] = { ...newContactInfo[2], title: e.target.value };
                    setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">地址</label>
                <input
                  type="text"
                  value={pageData.contactInfo[2].content}
                  onChange={(e) => {
                    const newContactInfo = [...pageData.contactInfo];
                    const encodedAddress = encodeURIComponent(e.target.value);
                    newContactInfo[2] = {
                      ...newContactInfo[2],
                      content: e.target.value,
                      link: `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
                    };
                    setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="新北市永和區永貞路107號3樓"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">描述</label>
                <input
                  type="text"
                  value={pageData.contactInfo[2].description}
                  onChange={(e) => {
                    const newContactInfo = [...pageData.contactInfo];
                    newContactInfo[2] = { ...newContactInfo[2], description: e.target.value };
                    setPageData((prev) => ({ ...prev, contactInfo: newContactInfo }));
                  }}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
            </div>
          </div>
        )}
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
