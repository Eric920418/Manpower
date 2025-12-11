"use client";
import Link from "next/link";
import Image from "next/image";
import { memo, useState } from "react";

export interface Resume {
  id: string;
  name: string;
  title: string;
  experience: string;
  location: string;
  country: string;
  photo: string;
  skills: string[];
}

interface ResumeCardProps {
  resume: Resume;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

// 使用 memo 避免不必要的重新渲染
const ResumeCard = memo(function ResumeCard({ resume, isSelected = false, onSelect }: ResumeCardProps) {
  const [imgSrc, setImgSrc] = useState(resume.photo);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect?.(resume.id, e.target.checked);
  };

  return (
    <div className={`group bg-white rounded-xl shadow-md border p-6 flex flex-col items-center text-center hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative ${
      isSelected
        ? 'border-brand-primary border-2 bg-brand-primary/5'
        : 'border-border hover:border-brand-primary'
    }`}>
      {/* 複選框 */}
      {onSelect && (
        <div className="absolute top-4 right-4 z-10">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              className="w-5 h-5 rounded border-2 border-brand-primary text-brand-primary focus:ring-2 focus:ring-brand-primary/50 cursor-pointer"
            />
          </label>
        </div>
      )}

      {/* 照片 */}
      <div className="relative mb-4 z-20">
        <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-accent rounded-full opacity-0 group-hover:opacity-100 blur transition-opacity duration-300 pointer-events-none"></div>
        <div className="relative w-24 h-24">
          <div className="w-full h-full rounded-full ring-4 ring-brand-primary/20 group-hover:ring-brand-primary/50 transition-all overflow-hidden pointer-events-none absolute inset-0"></div>
          <Image
            className="w-24 h-24 rounded-full object-cover transition-all duration-300 cursor-pointer hover:scale-[2.5] hover:rounded-lg hover:shadow-2xl hover:z-50"
            src={imgSrc}
            alt={`${resume.name} 的專業照片`}
            width={96}
            height={96}
            unoptimized
            onError={() => setImgSrc("/placeholder-avatar.png")}
          />
        </div>
      </div>

      {/* 姓名 */}
      <h3 className="font-bold text-lg text-text-primary mb-1">
        {resume.name}
      </h3>

      {/* 職位和經驗 */}
      <p className="text-sm text-brand-secondary font-semibold mb-1">
        {resume.title}
      </p>
      <p className="text-xs text-text-secondary mb-3">{resume.experience}</p>

      {/* 地點 */}
      <div className="flex items-center gap-2 text-text-secondary text-xs mb-4">
        <span className="material-symbols-outlined text-base text-brand-primary">
          location_on
        </span>
        <span>
          {resume.location}, {resume.country}
        </span>
      </div>

      {/* 技能標籤 */}
      <div className="flex flex-wrap justify-center gap-2 mb-6 min-h-[60px]">
        {resume.skills.slice(0, 3).map((skill, index) => (
          <span
            key={index}
            className="bg-brand-primary/10 text-brand-secondary text-xs font-semibold px-2.5 py-1 rounded-full border border-brand-primary/20 hover:bg-brand-primary/20 transition-colors"
          >
            {skill}
          </span>
        ))}
      </div>

      {/* 查看按鈕 */}
      <Link
        href={`/resume/${resume.id}`}
        className="mt-auto w-full flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-brand-primary text-text-on-brand text-sm font-bold hover:bg-brand-accent hover:scale-105 transition-all shadow-md hover:shadow-lg"
      >
        <span>查看完整履歷</span>
        <span className="material-symbols-outlined text-base">
          arrow_forward
        </span>
      </Link>
    </div>
  );
});

export default ResumeCard;
