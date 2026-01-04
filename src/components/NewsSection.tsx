"use client";
import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

interface Category {
  label: string;
  value: string;
  active: boolean;
}

interface FeaturedArticle {
  badge: string;
  title: string;
  description: string;
  image: string;
  link: string;
}

interface Article {
  category: string;
  date: string;
  title: string;
  description: string;
  image: string;
  link: string;
}

interface NewsSectionProps {
  title: string;
  description: string;
  categories: Category[];
  featuredArticle: FeaturedArticle;
  articles: Article[];
}

export default function NewsSection({
  title,
  description,
  categories,
  featuredArticle,
  articles,
}: NewsSectionProps) {
  // 找出預設 active 的分類，若無則使用第一個（通常是「全部」）
  // 使用 label 作為 activeCategory，因為文章的 category 欄位存的是分類的 label
  const defaultCategory = categories.find(c => c.active)?.label || categories[0]?.label || "全部";
  const [activeCategory, setActiveCategory] = useState(defaultCategory);

  // 根據選擇的分類過濾文章（「全部」或第一個分類顯示所有文章）
  const filteredArticles = useMemo(() => {
    const isFirstCategory = categories.length > 0 && activeCategory === categories[0].label;
    if (activeCategory === "all" || activeCategory === "全部" || isFirstCategory) {
      return articles;
    }
    return articles.filter(article => article.category === activeCategory);
  }, [activeCategory, articles, categories]);

  return (
    <section className="bg-bg-primary py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 標題區塊 */}
        <div className="flex flex-wrap justify-between gap-3 mb-8">
          <div className="flex w-full sm:min-w-72 flex-col gap-3">
            <h2 className="text-text-primary text-4xl font-black leading-tight tracking-tight">
              {title}
            </h2>
            <p className="text-text-secondary text-base font-normal leading-normal">
              {description}
            </p>
          </div>
        </div>

        {/* 分類標籤 */}
        <div className="flex gap-2 flex-wrap mb-8">
          {categories.map((category, index) => (
            <button
              key={index}
              onClick={() => setActiveCategory(category.label)}
              className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 cursor-pointer transition-all ${
                activeCategory === category.label
                  ? "bg-brand-primary text-text-on-brand"
                  : "bg-bg-secondary text-text-secondary hover:bg-border"
              }`}
            >
              <p className="text-sm font-medium leading-normal">{category.label}</p>
            </button>
          ))}
        </div>

        {/* 內容區塊 */}
        <div className="grid grid-cols-1 gap-8">
          {/* 精選文章 */}
          <Link
            href={featuredArticle.link}
            className="flex flex-col md:flex-row items-stretch gap-6 group cursor-pointer"
          >
            <div className="md:w-1/2 h-56 md:h-72 rounded-xl overflow-hidden">
              <Image
                src={featuredArticle.image}
                alt={featuredArticle.title}
                width={600}
                height={350}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="flex flex-col justify-center gap-4 md:w-1/2">
              <div className="flex flex-col gap-2">
                <p className="text-brand-secondary text-sm font-bold leading-normal tracking-wide">
                  {featuredArticle.badge}
                </p>
                <h3 className="text-text-primary text-2xl font-bold leading-tight">
                  {featuredArticle.title}
                </h3>
                <p className="text-text-secondary text-base font-normal leading-normal line-clamp-5">
                  {featuredArticle.description}
                </p>
              </div>
              <span className="flex items-center gap-2 text-brand-primary text-sm font-bold mt-2">
                <span>閱讀更多</span>
                <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </span>
            </div>
          </Link>

          {/* 一般文章網格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredArticles.map((article, index) => (
              <Link
                key={index}
                href={article.link}
                className="flex flex-col gap-4 group cursor-pointer"
              >
                <div className="w-full h-48 rounded-xl overflow-hidden">
                  <Image
                    src={article.image}
                    alt={article.title}
                    width={400}
                    height={250}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-text-secondary text-sm font-normal leading-normal">
                    {article.category} | {article.date}
                  </p>
                  <h4 className="text-text-primary text-lg font-bold leading-snug">
                    {article.title}
                  </h4>
                  <p className="text-text-secondary text-sm font-normal leading-normal line-clamp-3">
                    {article.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
