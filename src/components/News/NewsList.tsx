"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface News {
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  date: string;
  category: string;
  link: string;
}

interface Props {
  newsList: News[];
  activeCategory: string;
}

export default function NewsList({ newsList, activeCategory }: Props) {
  const filteredNews = activeCategory === "全部"
    ? newsList
    : newsList.filter((news) => news.category === activeCategory);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {filteredNews.map((news, index) => {
        // 確保 slug 存在，沒有則使用 index 作為備用
        const newsSlug = news.slug || `item-${index}`;
        return (
        <motion.article
          key={newsSlug}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group"
        >
          <Link href={`/news/${newsSlug}`}>
            <div className="relative h-48 overflow-hidden">
              <Image
                src={news.image}
                alt={news.title}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-brand-primary text-white rounded-full text-xs font-medium">
                  {news.category}
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <span className="material-symbols-outlined text-base">calendar_today</span>
                <span>{news.date}</span>
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2 group-hover:text-brand-primary transition-colors">
                {news.title}
              </h3>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {news.excerpt}
              </p>

              <div className="flex items-center text-brand-primary font-medium group-hover:gap-3 gap-2 transition-all">
                <span>閱讀更多</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </div>
            </div>
          </Link>
        </motion.article>
        );
      })}

      {filteredNews.length === 0 && (
        <div className="col-span-full text-center py-16">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4 block">
            article
          </span>
          <p className="text-gray-500 text-lg">此分類目前沒有文章</p>
        </div>
      )}
    </div>
  );
}
