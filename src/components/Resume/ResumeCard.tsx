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
}

const ResumeCard = memo(function ResumeCard({
  resume,
  isSelected = false,
  onSelect,
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

  return (
    <>
      <div
        className={`group bg-white rounded-xl shadow-md border overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300 relative ${
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

        {/* 照片區域 - hover 放大 */}
        <div
          className="relative w-full aspect-[3/4] bg-gradient-to-b from-pink-100 to-pink-50 overflow-hidden cursor-pointer"
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
        >
          {!imageError ? (
            <Image
              src={resume.photo}
              alt={`${resume.name} 的照片`}
              fill
              className="object-cover object-top hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              onError={() => setImageError(true)}
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
            <div className="flex">
              <span className="text-gray-500 w-20 shrink-0">外國人編號：</span>
              <span className="font-medium">{resume.foreignId}</span>
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

      {/* 全螢幕放大預覽 - 使用 Portal */}
      {mounted &&
        isZoomed &&
        !imageError &&
        createPortal(
          <div
            className="fixed inset-0 bg-black flex items-center justify-center pointer-events-none"
            style={{ zIndex: 99999 }}
          >
            <Image
              src={resume.photo}
              alt={`${resume.name} 的照片`}
              width={800}
              height={1067}
              className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain"
              unoptimized
            />
          </div>,
          document.body
        )}
    </>
  );
});

export default ResumeCard;
