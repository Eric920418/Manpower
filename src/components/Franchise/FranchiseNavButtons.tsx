"use client";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

// 導航按鈕為頁面結構性元素
export const navItems = [
  { id: "main", label: "市場趨勢", icon: "trending_up" },
  { id: "details", label: "加盟詳情", icon: "description" },
  { id: "seminar", label: "報名加盟說明會", icon: "event" },
  { id: "stories", label: "加盟主分享", icon: "forum" },
];

interface FranchiseNavButtonsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function FranchiseNavButtons({ activeTab, onTabChange }: FranchiseNavButtonsProps) {
  const [isFixed, setIsFixed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Hero 區塊高度 + Header 高度
      const scrollThreshold = 600;
      setIsFixed(window.scrollY > scrollThreshold);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = (id: string) => {
    onTabChange(id);
    // 切換分頁時滾動到內容區頂部
    window.scrollTo({
      top: 600,
      behavior: "smooth",
    });
  };

  return (
    <>
      {/* 佔位元素,避免內容跳動 */}
      {isFixed && <div className="h-[72px]" />}

      <section className={`${isFixed ? 'fixed top-0 left-0 right-0' : 'relative'} z-40 bg-white backdrop-blur-sm border-b border-gray-200 shadow-md transition-all duration-300`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-wrap gap-3 justify-center">
            {navItems.map((item, index) => (
              <motion.button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                  activeTab === item.id
                    ? "bg-brand-primary text-white shadow-lg scale-105"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                }`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
