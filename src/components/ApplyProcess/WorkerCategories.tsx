"use client";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  steps: Array<{
    number: number;
    title: string;
    description: string;
    icon: string;
  }>;
}

interface Props {
  categories: Category[];
}

export default function WorkerCategories({ categories }: Props) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          ref={ref}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-800 mb-4">
            工作類別
          </h2>
          <p className="text-gray-600 text-lg">
            選擇適合您的工作類別，開啟職涯新篇章
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100"
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -10 }}
            >
              {/* 背景漸層 */}
              <div className="relative h-48 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-90`} />

                {/* 圖標 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-7xl drop-shadow-lg">
                    {category.icon}
                  </span>
                </div>
              </div>

              {/* 內容 */}
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {category.name}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed min-h-[4rem]">
                  {category.description}
                </p>

                {/* 步驟數量標籤 */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 text-brand-primary">
                    <span className="material-symbols-outlined text-lg">
                      list_alt
                    </span>
                    <span className="font-semibold">
                      {category.steps.length} 個申請步驟
                    </span>
                  </div>
                </div>

                {/* 申請按鈕 */}
                <Link
                  href={`/application-process?category=${category.id}`}
                  className="block w-full"
                >
                  <motion.button
                    className={`w-full py-3 bg-gradient-to-r ${category.color} text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-300`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    查看申請流程
                    <span className="material-symbols-outlined ml-2 align-middle text-lg">
                      arrow_forward
                    </span>
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
