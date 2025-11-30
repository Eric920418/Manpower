"use client";
import Image from "next/image";
import Link from "next/link";

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
        <div className="grid grid-cols-3 gap-8 mb-16 max-w-3xl mx-auto">
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
                <button className="w-full py-3 bg-brand-primary hover:bg-brand-accent text-text-on-brand font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-lg">
                  <span>查看詳細資料</span>
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
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
    </section>
  );
}
