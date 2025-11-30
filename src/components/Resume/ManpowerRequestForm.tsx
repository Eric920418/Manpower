"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useStaffList } from "@/hooks/useStaffList";

interface SelectedResume {
  id: string;
  name: string;
  title: string;
  photo: string;
}

export default function ManpowerRequestForm() {
  const router = useRouter();
  const [selectedResumes, setSelectedResumes] = useState<SelectedResume[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  // 使用自訂 Hook 獲取業務人員列表（帶 5 分鐘快取）
  const { staffList, loading: staffLoading } = useStaffList();

  const [formData, setFormData] = useState({
    contactPerson: "",
    contactPhone: "",
    contactEmail: "",
    lineId: "",
    referrerId: "", // 改為業務人員 ID
  });

  // 申請資格選項
  const qualificationOptions = [
    { id: "barthelIndex", label: "巴氏量表" },
    { id: "longTermCare6Months", label: "曾使用長照六個月" },
    { id: "disabilityCard", label: "身心障礙手冊" },
    { id: "dementiaAssessment", label: "失智評估量表" },
    { id: "over80NoAssessment", label: "80歲以上長者免評" },
    { id: "domesticHelper", label: "申請幫傭資格" },
    { id: "previousForeignWorker", label: "一年內曾聘僱外籍移工" },
    { id: "cancerNoAssessment", label: "癌症免評患者" },
    { id: "needAssistance", label: "需業務人員協助了解申請資格" },
  ];

  const [selectedQualifications, setSelectedQualifications] = useState<string[]>([]);

  useEffect(() => {
    // 從 sessionStorage 獲取選中的完整履歷資料
    const storedData = sessionStorage.getItem("selectedResumesData");
    if (!storedData) {
      // 如果沒有選中任何履歷，返回列表頁
      router.push("/resume");
      return;
    }

    try {
      const resumes = JSON.parse(storedData) as SelectedResume[];
      setSelectedResumes(resumes);
      // 顯示提醒彈窗
      setShowReminderModal(true);
    } catch (error) {
      console.error("解析選中履歷失敗：", error);
      router.push("/resume");
    }
  }, [router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleQualificationChange = (qualificationId: string) => {
    setSelectedQualifications((prev) => {
      if (prev.includes(qualificationId)) {
        return prev.filter((id) => id !== qualificationId);
      } else {
        return [...prev, qualificationId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 表單驗證
    if (!formData.contactPerson.trim()) {
      alert("請填寫聯絡人姓名");
      return;
    }
    if (!formData.contactPhone.trim()) {
      alert("請填寫聯絡電話");
      return;
    }
    // Email 改為選填，不再驗證必填

    setIsSubmitting(true);

    try {
      // 準備提交資料
      const submitData = {
        contactPerson: formData.contactPerson,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail || undefined, // 選填
        lineId: formData.lineId || undefined, // 選填
        referrerId: formData.referrerId || undefined, // 介紹人業務人員 ID
        selectedResumeIds: selectedResumes.map((r) => r.id),
        selectedResumes: selectedResumes, // 完整的工作者資料
        qualifications: selectedQualifications, // 申請資格
      };

      // 提交到 API
      const response = await fetch("/api/manpower-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "提交失敗");
      }

      const result = await response.json();

      // 清除 sessionStorage
      sessionStorage.removeItem("selectedResumesData");

      // 顯示成功訊息
      alert(
        `✅ 需求已成功提交！\n需求單號：${result.requestNo}\n\n我們將盡快與您聯繫。`
      );

      // 導航回履歷列表頁
      router.push("/resume");
    } catch (error) {
      console.error("提交需求失敗：", error);
      alert(
        `❌ 提交失敗：${error instanceof Error ? error.message : "未知錯誤"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveResume = (id: string) => {
    const newSelected = selectedResumes.filter((r) => r.id !== id);
    setSelectedResumes(newSelected);

    if (newSelected.length === 0) {
      sessionStorage.removeItem("selectedResumesData");
      router.push("/resume");
    } else {
      sessionStorage.setItem(
        "selectedResumesData",
        JSON.stringify(newSelected)
      );
    }
  };

  if (selectedResumes.length === 0) {
    // 等待重導向時顯示載入畫面
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-brand-primary animate-spin">
            progress_activity
          </span>
          <p className="mt-4 text-text-secondary">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 提醒彈窗 */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowReminderModal(false)}
          />
          {/* 彈窗內容 */}
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4 animate-in zoom-in-95 fade-in duration-300">
            {/* 圖示 */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-amber-600">
                  schedule
                </span>
              </div>
            </div>
            {/* 標題 */}
            <h3 className="text-xl font-bold text-text-primary text-center mb-3">
              請盡速完成簽約
            </h3>
            {/* 內容 */}
            <p className="text-text-secondary text-center mb-6">
              以保留您選擇的履歷人員
            </p>
            {/* 按鈕 */}
            <button
              onClick={() => setShowReminderModal(false)}
              className="w-full py-3 bg-brand-primary text-text-on-brand rounded-lg font-bold hover:bg-brand-accent transition-all"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* 選中的履歷列表 */}
      <div className="bg-white rounded-xl shadow-md border border-border p-6 mb-8">
        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-brand-primary">
            group
          </span>
          已選擇的求職者 ({selectedResumes.length} 位)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {selectedResumes.map((resume) => (
            <div
              key={resume.id}
              className="flex items-center gap-3 p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg group hover:border-brand-primary transition-all"
            >
              <Image
                src={resume.photo}
                alt={resume.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-brand-primary/20"
                unoptimized
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-text-primary text-sm truncate">
                  {resume.name}
                </p>
                <p className="text-xs text-text-secondary truncate">
                  {resume.title}
                </p>
              </div>
              <button
                onClick={() => handleRemoveResume(resume.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-full transition-all"
                title="移除"
              >
                <span className="material-symbols-outlined text-red-500 text-base">
                  close
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 需求表單 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 公司資訊 */}
        <div className="bg-white rounded-xl shadow-md border border-border p-6">
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-brand-primary">
              business
            </span>
            雇主資料
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                聯絡人姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                placeholder="請輸入您的姓名"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                聯絡電話 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                placeholder="請輸入聯絡電話"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Email <span className="text-xs text-gray-500">(選填)</span>
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                placeholder="請輸入 Email"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Line ID <span className="text-xs text-gray-500">(選填)</span>
              </label>
              <input
                type="text"
                name="lineId"
                value={formData.lineId}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary"
                placeholder="請輸入 Line ID"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-text-primary mb-2">
                介紹人 <span className="text-xs text-gray-500">(選填)</span>
              </label>
              <select
                name="referrerId"
                value={formData.referrerId}
                onChange={handleInputChange}
                disabled={staffLoading}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {staffLoading ? "載入中..." : "-- 請選擇介紹人 --"}
                </option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
              <div className="mt-1 text-xs text-gray-500">
                如果您是經由業務人員介紹，請選擇該業務人員
              </div>
            </div>
          </div>
        </div>

        {/* 申請資格 */}
        <div className="bg-white rounded-xl shadow-md border border-border p-6">
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-brand-primary">
              checklist
            </span>
            申請資格 <span className="text-xs font-normal text-gray-500">(可複選)</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {qualificationOptions.map((option) => (
              <label
                key={option.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedQualifications.includes(option.id)
                    ? "bg-brand-primary/10 border-brand-primary"
                    : "bg-gray-50 border-border hover:border-brand-primary/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedQualifications.includes(option.id)}
                  onChange={() => handleQualificationChange(option.id)}
                  className="w-5 h-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                />
                <span className="text-sm text-text-primary">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 提交按鈕 */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 border-border bg-white text-text-secondary hover:bg-gray-50 hover:border-gray-400 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            返回
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-brand-primary text-text-on-brand hover:bg-brand-accent hover:scale-105 transition-all font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin">
                  progress_activity
                </span>
                提交中...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">send</span>
                提交需求
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
