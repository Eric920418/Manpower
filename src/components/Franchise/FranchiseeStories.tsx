"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface Story {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  date: string;
  category: string;
  description: string;
  content?: string;
  youtubeUrl?: string;
}

interface FranchiseeStoriesData {
  title?: string;
  subtitle?: string;
  stories?: Story[];
}

interface FranchiseeStoriesProps {
  data?: FranchiseeStoriesData;
}

export default function FranchiseeStories({ data }: FranchiseeStoriesProps) {
  const stories = data?.stories || [];

  if (stories.length === 0) {
    return (
      <section id="stories" className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-6 text-center text-gray-500">
          目前尚無分享內容
        </div>
      </section>
    );
  }

  return (
    <section id="stories" className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stories.map((story, index) => (
            <Link key={story.id || index} href={`/franchise/stories/${story.id}`}>
              <motion.article
                className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group cursor-pointer h-full"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                {/* 圖片區塊 */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  {story.image ? (
                    <Image
                      src={story.image}
                      alt={story.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-gray-400">person</span>
                    </div>
                  )}

                  {/* 金色標題標籤 */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="inline-block">
                      <span className="text-xs text-white/80 tracking-wider mb-1 block">
                        {story.subtitle || "加盟主分享"}
                      </span>
                      <h3 className="text-xl md:text-2xl font-bold text-white"
                          style={{
                            background: 'linear-gradient(135deg, #d4a853 0%, #f5d98a 50%, #d4a853 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}>
                        {story.title}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* 內容區塊 */}
                <div className="p-5">
                  {/* 日期和類別 */}
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">calendar_month</span>
                      {story.date}
                    </span>
                    <span className="text-brand-primary font-medium">
                      {story.category}
                    </span>
                  </div>

                  {/* 描述 */}
                  <p className="text-gray-600 line-clamp-3 leading-relaxed">
                    {story.description}
                  </p>
                </div>
              </motion.article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
