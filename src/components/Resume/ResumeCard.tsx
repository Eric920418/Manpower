"use client";
import Image from "next/image";
import Link from "next/link";
import { memo, useState, useEffect } from "react";
import { createPortal } from "react-dom";

export interface Resume {
  id: string;
  name: string;
  foreignId: string;
  age: number;
  country: string;
  photo: string;
  education: string;
  height: number;
  weight: number;
  isNew: boolean;
  sourceType?: string;
  // 保留舊欄位以兼容
  title?: string;
  experience?: string;
  location?: string;
  skills?: string[];
}

interface ResumeCardProps {
  resume: Resume;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  viewMode?: "grid" | "list";
}

const ResumeCard = memo(function ResumeCard({
  resume,
  isSelected = false,
  onSelect,
  viewMode = "grid",
}: ResumeCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSelectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(resume.id, !isSelected);
  };

  // 國家對應顏色 - 使用品牌色系
  const countryColors: Record<string, { bg: string; text: string }> = {
    印尼: { bg: "bg-brand-primary", text: "text-white" },
    菲律賓: { bg: "bg-brand-secondary", text: "text-white" },
    越南: { bg: "bg-brand-accent", text: "text-white" },
    泰國: { bg: "bg-[#5BA3C0]", text: "text-white" },
    印度: { bg: "bg-[#0D5A7A]", text: "text-white" },
  };

  const countryStyle = countryColors[resume.country] || {
    bg: "bg-brand-secondary",
    text: "text-white",
  };

  // 列表視圖
  if (viewMode === "list") {
    return (
      <>
        <div
          className={`group bg-white rounded-xl shadow-md border overflow-hidden flex flex-row hover:shadow-xl transition-all duration-300 relative w-full ${
            isSelected
              ? "border-brand-primary border-2 ring-2 ring-brand-primary/30"
              : "border-gray-200 hover:border-brand-primary"
          }`}
        >
          {/* NEW 標籤 */}
          {resume.isNew && (
            <div className="absolute top-3 left-3 z-20">
              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded shadow-md">
                NEW
              </span>
            </div>
          )}

          {/* 照片區域 - 左側固定寬度 */}
          <div
            className="relative w-32 sm:w-40 shrink-0 bg-gradient-to-b from-pink-100 to-pink-50 overflow-hidden cursor-pointer"
          >
            {!imageError ? (
              <Image
                src={resume.photo}
                alt={`${resume.name} 的照片`}
                fill
                className="object-cover object-top hover:scale-105 transition-transform duration-300"
                sizes="160px"
                onError={() => setImageError(true)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsZoomed(true);
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <span className="material-symbols-outlined text-4xl text-gray-300">
                  person
                </span>
              </div>
            )}
          </div>

          {/* 資訊區域 - 右側展開 */}
          <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            {/* 主要資訊 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h3 className="font-bold text-lg text-gray-900 leading-tight">
                  {resume.name}
                </h3>
                <span
                  className={`inline-block ${countryStyle.bg} ${countryStyle.text} text-xs font-bold px-3 py-1 rounded`}
                >
                  {resume.country}
                </span>
                {resume.sourceType && (
                  <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded">
                    {resume.sourceType}
                  </span>
                )}
              </div>

              {/* 詳細資訊 - 水平排列 */}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">編號：</span>
                  <span className="font-medium">{resume.foreignId}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">年齡：</span>
                  <span className="font-medium">{resume.age} 歲</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">學歷：</span>
                  <span className="font-medium">{resume.education}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">身高/體重：</span>
                  <span className="font-medium">
                    {resume.height}cm / {resume.weight}kg
                  </span>
                </div>
              </div>
            </div>

            {/* 右側操作區 */}
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={`/resume/${resume.id}`}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:border-brand-primary hover:text-brand-primary transition-colors text-sm font-medium"
              >
                <span className="material-symbols-outlined text-base">visibility</span>
                查看詳情
              </Link>
              <button
                onClick={handleSelectClick}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 ${
                  isSelected
                    ? "bg-brand-secondary text-white shadow-lg"
                    : "bg-brand-primary text-white hover:bg-brand-accent hover:shadow-md"
                }`}
              >
                {isSelected ? "✓ 已選定" : "選定"}
              </button>
            </div>
          </div>
        </div>

        {/* 全螢幕放大預覽 */}
        {mounted &&
          isZoomed &&
          !imageError &&
          createPortal(
            <div
              className="fixed inset-0 bg-black/90 flex items-center justify-center cursor-pointer"
              style={{ zIndex: 99999 }}
              onClick={() => setIsZoomed(false)}
            >
              <Image
                src={resume.photo}
                alt={`${resume.name} 的照片`}
                width={800}
                height={1067}
                className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain"
                unoptimized
              />
              <div className="absolute top-4 right-4 text-white/70 flex items-center gap-2">
                <span className="text-sm">點擊任意處關閉</span>
                <span className="material-symbols-outlined">close</span>
              </div>
            </div>,
            document.body
          )}
      </>
    );
  }

  // 網格視圖（預設）
  return (
    <>
      <div
        className={`group bg-white rounded-xl shadow-md border overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 relative w-full max-w-[280px] mx-auto ${
          isSelected
            ? "border-brand-primary border-2 ring-2 ring-brand-primary/30"
            : "border-gray-200 hover:border-brand-primary"
        }`}
      >
        {/* NEW 標籤 */}
        {resume.isNew && (
          <div className="absolute top-3 left-3 z-20">
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded shadow-md">
              NEW
            </span>
          </div>
        )}

        {/* 照片區域 - 點擊放大 */}
        <div
          className="relative w-full aspect-[3/4] bg-gradient-to-b from-pink-100 to-pink-50 overflow-hidden cursor-pointer"
        >
          {!imageError ? (
            <Image
              src={resume.photo}
              alt={`${resume.name} 的照片`}
              fill
              className="object-cover object-top hover:scale-105 transition-transform duration-300"
              sizes="280px"
              onError={() => setImageError(true)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsZoomed(true);
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <span className="material-symbols-outlined text-6xl text-gray-300">
                person
              </span>
            </div>
          )}
          {/* 點擊查看詳情提示 */}
          <Link
            href={`/resume/${resume.id}`}
            className="absolute inset-0 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/50 to-transparent"
          >
            <span className="text-white text-sm font-medium mb-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-base">visibility</span>
              查看詳情
            </span>
          </Link>
        </div>

        {/* 資訊區域 */}
        <div className="p-4 flex flex-col flex-1">
          {/* 姓名 */}
          <h3 className="font-bold text-lg text-gray-900 mb-2 leading-tight">
            {resume.name}
          </h3>

          {/* 國籍標籤 */}
          <div className="mb-3">
            <span
              className={`inline-block ${countryStyle.bg} ${countryStyle.text} text-xs font-bold px-3 py-1 rounded`}
            >
              {resume.country}
            </span>
          </div>

          {/* 詳細資訊 */}
          <div className="space-y-1.5 text-sm text-gray-700 mb-4">
            <div className="flex items-center">
              <span className="text-gray-500 shrink-0 whitespace-nowrap">外國人編號：</span>
              <span className="font-medium truncate" title={resume.foreignId}>{resume.foreignId}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-20 shrink-0">年齡：</span>
              <span className="font-medium">{resume.age}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-20 shrink-0">學歷：</span>
              <span className="font-medium">{resume.education}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-20 shrink-0">身高/體重：</span>
              <span className="font-medium">
                {resume.height}cm/{resume.weight}kg
              </span>
            </div>
            {resume.sourceType && (
              <div className="flex">
                <span className="text-gray-500 w-20 shrink-0">來源類型：</span>
                <span className="font-medium">{resume.sourceType}</span>
              </div>
            )}
          </div>

          {/* 選定按鈕 */}
          <button
            onClick={handleSelectClick}
            className={`mt-auto w-full py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ${
              isSelected
                ? "bg-brand-secondary text-white shadow-lg"
                : "bg-brand-primary text-white hover:bg-brand-accent hover:shadow-md"
            }`}
          >
            {isSelected ? "✓ 已選定" : "選定"}
          </button>
        </div>
      </div>

      {/* 全螢幕放大預覽 - 使用 Portal，點擊關閉 */}
      {mounted &&
        isZoomed &&
        !imageError &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/90 flex items-center justify-center cursor-pointer"
            style={{ zIndex: 99999 }}
            onClick={() => setIsZoomed(false)}
          >
            <Image
              src={resume.photo}
              alt={`${resume.name} 的照片`}
              width={800}
              height={1067}
              className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain"
              unoptimized
            />
            {/* 關閉提示 */}
            <div className="absolute top-4 right-4 text-white/70 flex items-center gap-2">
              <span className="text-sm">點擊任意處關閉</span>
              <span className="material-symbols-outlined">close</span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
});

export default ResumeCard;
