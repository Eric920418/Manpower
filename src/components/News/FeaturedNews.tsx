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
  news: News;
}

export default function FeaturedNews({ news }: Props) {
  // 確保 slug 存在
  const newsSlug = news.slug || "featured";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="mb-16"
    >
      <div className="relative overflow-hidden rounded-2xl shadow-2xl group">
        <div className="relative h-[500px]">
          <Image
            src={news.image}
            alt={news.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="flex items-center gap-4 mb-4">
            <span className="px-4 py-2 bg-brand-primary text-white rounded-full text-sm font-medium">
              精選
            </span>
            <span className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm">
              {news.category}
            </span>
            <span className="text-white/80 text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-base">calendar_today</span>
              {news.date}
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {news.title}
          </h2>
          <p className="text-lg text-white/90 mb-6 max-w-3xl">
            {news.excerpt}
          </p>

          <Link
            href={`/news/${newsSlug}`}
            className="inline-flex items-center gap-2 bg-white text-brand-primary px-6 py-3 rounded-full font-semibold hover:bg-gray-50 transition-all duration-300 shadow-xl"
          >
            <span>閱讀更多</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
