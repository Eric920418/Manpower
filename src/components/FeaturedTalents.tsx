"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface Stat {
  number: string;
  label: string;
}

interface Talent {
  name: string;
  position: string;
  image: string;
  experience: string;
  location: string;
  skills: string[];
  detailUrl?: string;
}

interface FeaturedTalentsProps {
  badge: string;
  title: string;
  description: string;
  stats: Stat[];
  talents: Talent[];
  ctaText: string;
  ctaLink: string;
}

export default function FeaturedTalents({
  badge,
  title,
  description,
  stats,
  talents,
  ctaText,
  ctaLink,
}: FeaturedTalentsProps) {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<Talent | null>(null);

  const handleViewDetail = (talent: Talent) => {
    if (talent.detailUrl) {
      setSelectedTalent(talent);
      setQrModalOpen(true);
    }
  };

  const closeModal = () => {
    setQrModalOpen(false);
    setSelectedTalent(null);
  };

  return (
    <section className="py-10 bg-bg-primary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 標題區塊 */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 rounded-full border border-brand-primary/20">
            <span className="material-symbols-outlined text-brand-secondary text-sm">
              verified
            </span>
            <span className="text-sm font-semibold text-brand-secondary">
              {badge}
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-text-primary tracking-tight">
            {title}
          </h2>

          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        {/* 統計數字區塊 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 mb-16 max-w-3xl mx-auto">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 bg-bg-primary backdrop-blur-sm rounded-2xl border border-border hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-brand-primary"
            >
              <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-accent mb-2">
                {stat.number}
              </div>
              <div className="text-sm font-medium text-text-secondary">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* 人才卡片區塊 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {talents.map((talent, index) => (
            <div
              key={index}
              className="group relative bg-bg-primary rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-border hover:border-brand-primary hover:-translate-y-2"
            >
              {/* 頂部漸變裝飾 */}
              <div className="h-2 bg-gradient-to-r from-brand-primary via-brand-accent to-brand-secondary"></div>

              <div className="p-6">
                {/* 頭像與基本資訊 */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-primary to-brand-accent rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                    <Image
                      src={talent.image}
                      alt={talent.name}
                      width={120}
                      height={120}
                      className="relative rounded-full object-cover ring-4 ring-bg-primary shadow-xl"
                    />
                  </div>

                  <h3 className="text-xl font-bold text-text-primary mb-1">
                    {talent.name}
                  </h3>

                  <p className="text-sm font-semibold text-brand-secondary mb-4">
                    {talent.position}
                  </p>

                  {/* 經驗與地點 */}
                  <div className="space-y-2 w-full">
                    <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                      <span className="material-symbols-outlined text-base">work_history</span>
                      <span>{talent.experience}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      <span>{talent.location}</span>
                    </div>
                  </div>
                </div>

                {/* 技能標籤 */}
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  {talent.skills.slice(0, 3).map((skill, skillIndex) => (
                    <span
                      key={skillIndex}
                      className="px-3 py-1 bg-bg-secondary text-text-secondary text-xs font-medium rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* 查看按鈕 */}
                <button
                  onClick={() => handleViewDetail(talent)}
                  disabled={!talent.detailUrl}
                  className={`w-full py-3 font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-lg ${
                    talent.detailUrl
                      ? "bg-brand-primary hover:bg-brand-accent text-text-on-brand cursor-pointer"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <span>{talent.detailUrl ? "查看詳細資料" : "暫無詳細資料"}</span>
                  {talent.detailUrl && (
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                      qr_code_2
                    </span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* CTA 按鈕 */}
        <div className="text-center">
          <Link
            href={ctaLink}
            className="inline-flex items-center gap-3 px-8 py-4 bg-brand-secondary text-text-on-brand font-bold text-lg rounded-full hover:scale-105 hover:bg-brand-primary transition-all duration-300 shadow-xl hover:shadow-2xl"
          >
            <span>{ctaText}</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* QR Code 彈窗 */}
      {qrModalOpen && selectedTalent && selectedTalent.detailUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="relative bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 關閉按鈕 */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            {/* 標題 */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-1">
                {selectedTalent.name}
              </h3>
              <p className="text-sm text-gray-500">{selectedTalent.position}</p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white rounded-xl shadow-inner border-2 border-gray-100">
                <QRCodeSVG
                  value={selectedTalent.detailUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            {/* 提示文字 */}
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                掃描 QR Code 查看詳細資料
              </p>
              <p className="text-xs text-gray-400 break-all">
                {selectedTalent.detailUrl}
              </p>
            </div>

            {/* 關閉按鈕 */}
            <button
              onClick={closeModal}
              className="w-full mt-6 py-3 bg-brand-primary hover:bg-brand-accent text-white font-semibold rounded-lg transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
