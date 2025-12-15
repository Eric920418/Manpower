"use client";
import Image from "next/image";
import Link from "next/link";
import { memo, useState } from "react";

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

  const handleSelectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(resume.id, !isSelected);
  };

  // 國家對應顏色
  const countryColors: Record<string, { bg: string; text: string }> = {
    印尼: { bg: "bg-amber-400", text: "text-blue-900" },
    菲律賓: { bg: "bg-blue-500", text: "text-white" },
    越南: { bg: "bg-red-500", text: "text-yellow-300" },
    泰國: { bg: "bg-purple-500", text: "text-white" },
    印度: { bg: "bg-orange-500", text: "text-white" },
  };

  const countryStyle = countryColors[resume.country] || {
    bg: "bg-gray-500",
    text: "text-white",
  };

  return (
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

      {/* 照片區域 */}
      <Link href={`/resume/${resume.id}`} className="block">
        <div className="relative w-full aspect-[3/4] bg-gradient-to-b from-pink-100 to-pink-50 overflow-hidden">
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
        </div>
      </Link>

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
              ? "bg-brand-primary text-white shadow-lg"
              : "bg-amber-400 text-gray-900 hover:bg-amber-500 hover:shadow-md"
          }`}
        >
          {isSelected ? "✓ 已選定" : "選定"}
        </button>
      </div>
    </div>
  );
});

export default ResumeCard;
